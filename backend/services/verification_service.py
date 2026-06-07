from sqlalchemy.orm import Session

from backend.models.certificate   import CertificateRecord
from backend.models.batch         import CertificateBatch
from backend.models.merkle        import MerkleProof
from backend.models.status        import CertificateStatus, CertificateLifecycleStatus
from backend.models.university    import University, TrustStatus
from backend.models.verification_log import VerificationLog
from backend.schemas.verification import (
    VerificationRequest, VerificationResponse,
    VerificationResult, InternalVerificationCode,
)
from backend.services.hashing_service  import hash_certificate
from backend.services.merkle_service   import reconstruct_merkle_root
from backend.services.signature_service import verify_merkle_root_signature


def verify_certificate(
    db: Session,
    payload: VerificationRequest,
    ip_address: str | None,
) -> VerificationResponse:
    response, internal_code = _run_pipeline(db, payload)
    _write_log(db, payload, internal_code, ip_address)
    return response


def _run_pipeline(
    db: Session,
    payload: VerificationRequest,
) -> tuple[VerificationResponse, InternalVerificationCode]:

    # Pre-step: reconstruct hash from all five user-supplied fields 
    expected_hash = hash_certificate(
        serial_number=payload.serial_number,
        fullname=payload.fullname,
        program=payload.program,
        graduation_year=payload.graduation_year,
        issuer=payload.issuer,
    )

    # Step 1: Lookup by serial number AND expected hash
    certificate = (
        db.query(CertificateRecord)
        .filter(
            CertificateRecord.serial_number == payload.serial_number,
            CertificateRecord.certificate_hash == expected_hash,
        )
        .first()
    )

    if certificate is None:
        # Determine internal code for admin logs without revealing to caller
        internal = _classify_not_found(db, payload, expected_hash)
        return (
            VerificationResponse(
                result=VerificationResult.NOT_VERIFIED,
                message=(
                    "The details provided could not be matched to a certificate record. "
                    "Ensure all five fields are entered exactly as they appear on "
                    "the issued certificate, including the correct degree type and program name."
                ),
            ),
            internal,
        )

    # Step 2: Internal consistency check (defence in depth
    # Re-hash the stored fields independently and compare to the stored hash.
    # This catches the scenario where an attacker modified both a field AND the hash column in the database (Step 1 would miss this because we matched on the user's expected hash, not the stored hash).

    stored_rehash = hash_certificate(
        serial_number=certificate.serial_number,
        fullname=certificate.fullname,
        program=certificate.program,
        graduation_year=certificate.graduation_year,
        issuer=certificate.issuer,
    )
    if stored_rehash != certificate.certificate_hash:
        # Stored data does not match its own stored hash.
        # This is a genuine database-level tamper event.
        # Log as DATA_TAMPERED internally; return generic CANNOT_VERIFY publicly.
        return (
            VerificationResponse(
                result=VerificationResult.CANNOT_VERIFY,
                message=(
                    "Certificate verification could not be completed due to a "
                    "system integrity issue. Please contact the issuing institution."
                ),
            ),
            InternalVerificationCode.DATA_TAMPERED,
        )

    # Step 3: Merkle proof reconstruction
    merkle_proof = (
        db.query(MerkleProof)
        .filter(MerkleProof.certificate_id == certificate.id)
        .first()
    )
    batch = (
        db.query(CertificateBatch)
        .filter(CertificateBatch.id == certificate.batch_id)
        .first()
    )

    if not merkle_proof or not batch:
        return (
            VerificationResponse(
                result=VerificationResult.CANNOT_VERIFY,
                message=(
                    "Certificate verification could not be completed due to a "
                    "system integrity issue. Please contact the issuing institution."
                ),
            ),
            InternalVerificationCode.BATCH_TAMPER_DETECTED,
        )

    reconstructed_root = reconstruct_merkle_root(
        leaf_hash=certificate.certificate_hash,
        proof_path=merkle_proof.proof_path,
    )
    if reconstructed_root != batch.merkle_root:
        return (
            VerificationResponse(
                result=VerificationResult.CANNOT_VERIFY,
                message=(
                    "Certificate verification could not be completed due to a "
                    "system integrity issue. Please contact the issuing institution."
                ),
            ),
            InternalVerificationCode.BATCH_TAMPER_DETECTED,
        )

    # Step 4: Digital signature validation
    university = (
        db.query(University)
        .filter(University.id == batch.university_id)
        .first()
    )

    if not university or not university.public_key:
        return (
            VerificationResponse(
                result=VerificationResult.CANNOT_VERIFY,
                message=(
                    "Certificate verification could not be completed. "
                    "The issuing institution could not be confirmed."
                ),
            ),
            InternalVerificationCode.UNTRUSTED_ISSUER,
        )

    if university.trust_status != TrustStatus.TRUSTED:
        return (
            VerificationResponse(
                result=VerificationResult.CANNOT_VERIFY,
                message=(
                    "Certificate verification could not be completed. "
                    "The issuing institution is not currently in trusted status."
                ),
            ),
            InternalVerificationCode.UNTRUSTED_ISSUER,
        )

    if not verify_merkle_root_signature(
        merkle_root_hex=batch.merkle_root,
        signature_b64=batch.signed_root,
        public_key_pem=university.public_key,
    ):
        return (
            VerificationResponse(
                result=VerificationResult.CANNOT_VERIFY,
                message=(
                    "Certificate verification could not be completed. "
                    "The issuing institution's signature could not be verified."
                ),
            ),
            InternalVerificationCode.UNTRUSTED_ISSUER,
        )

    # Step 5: Lifecycle status check 
    # Cryptographic verification has fully passed. The certificate is genuine. Now check whether it is administratively active.
    status_record = (
        db.query(CertificateStatus)
        .filter(CertificateStatus.certificate_id == certificate.id)
        .first()
    )

    current_status = (
        status_record.current_status
        if status_record
        else CertificateLifecycleStatus.ACTIVE
    )

    public_fields = dict(
        serial_number=certificate.serial_number,
        program=certificate.program,
        issuer=certificate.issuer,
        graduation_year=certificate.graduation_year,
    )

    if current_status == CertificateLifecycleStatus.REVOKED:
        return (
            VerificationResponse(
                result=VerificationResult.REVOKED,
                message=(
                    "This certificate has been revoked by the issuing institution. "
                    "The original record of issuance is valid, but the certificate "
                    "is no longer in active standing. Contact the institution for details."
                ),
                **public_fields,
            ),
            InternalVerificationCode.REVOKED,
        )

    if current_status == CertificateLifecycleStatus.SUSPENDED:
        return (
            VerificationResponse(
                result=VerificationResult.SUSPENDED,
                message=(
                    "This certificate is currently suspended by the issuing institution. "
                    "Contact the issuing institution for more information."
                ),
                **public_fields,
            ),
            InternalVerificationCode.SUSPENDED,
        )

    # All five steps passed — certificate is authentic and active
    return (
        VerificationResponse(
            result=VerificationResult.AUTHENTIC,
            message=(
                f"Certificate verified successfully. "
                f"Issued by {university.university_name}."
            ),
            **public_fields,
        ),
        InternalVerificationCode.AUTHENTIC,
    )


def _classify_not_found(
    db: Session,
    payload: VerificationRequest,
    expected_hash: str,
) -> InternalVerificationCode:
    """
    Runs AFTER the public response (NOT_VERIFIED) is already determined.
    Classifies the failure for internal logging without affecting the caller.

    Three cases:
      NOT_FOUND   — serial number does not exist at all
      INPUT_MISMATCH — serial exists, data is internally consistent,
                       user probably typed something wrong
      DATA_TAMPERED — serial exists, stored data doesn't hash to stored hash,
                      database-level modification detected
    """
    existing = (
        db.query(CertificateRecord)
        .filter(CertificateRecord.serial_number == payload.serial_number)
        .first()
    )

    if existing is None:
        return InternalVerificationCode.NOT_FOUND

    # Serial exists — check if the stored record is internally consistent
    internal_hash = hash_certificate(
        serial_number=existing.serial_number,
        fullname=existing.fullname,
        program=existing.program,
        graduation_year=existing.graduation_year,
        issuer=existing.issuer,
    )

    if internal_hash != existing.certificate_hash:
        # Stored fields don't produce the stored hash — actual tamper
        return InternalVerificationCode.DATA_TAMPERED

    # Stored record is internally consistent — user provided wrong input
    return InternalVerificationCode.INPUT_MISMATCH


def _write_log(
    db: Session,
    payload: VerificationRequest,
    internal_code: InternalVerificationCode,
    ip_address: str | None,
) -> None:
    """
    Writes the detailed internal code to verification_logs.
    The public response (VerificationResult) and the internal code
    (InternalVerificationCode) are both stored for admin analysis.
    """
    log = VerificationLog(
        serial_number=payload.serial_number,
        fullname=payload.fullname,
        verification_result=internal_code.value,   # detailed internal code
        ip_address=ip_address,
    )
    db.add(log)
    try:
        db.commit()
    except Exception:
        db.rollback()