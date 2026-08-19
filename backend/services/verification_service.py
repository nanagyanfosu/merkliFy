"""
Three-field verification pipeline.

Verifier provides: serial_number, fullname, issuer.
Program and graduation_year are retrieved from the stored record
after the initial match and used for hash reconstruction.

Name matching supports word-order flexibility:
  "John Doe" matches "Doe John" — internally flagged but
  publicly returns the same AUTHENTIC result.
  Missing letters or typos return NOT_VERIFIED with a helpful message.
"""
import re
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


def _normalise_name(name: str) -> str:
    """Lowercase, strip, collapse whitespace."""
    return re.sub(r"\s+", " ", name.strip().lower())


def _name_matches(submitted: str, stored: str) -> tuple[bool, bool]:
    """
    Returns (matched, was_reversed).
    Tries exact match first, then word-order-reversed match.
    """
    sub_norm  = _normalise_name(submitted)
    stor_norm = _normalise_name(stored)

    if sub_norm == stor_norm:
        return True, False

    # Try reversed word order: "Doe John" → ["John", "Doe"] → "john doe"
    sub_words  = sub_norm.split()
    stor_words = stor_norm.split()

    if sorted(sub_words) == sorted(stor_words):
        return True, True

    return False, False


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

    # ── Step 1: Find by serial + issuer ─────────────────────────────────────
    # Query by serial number and issuer (both are known from input).
    # This is the first gate — if neither matches, certificate doesn't exist.
    certificate = (
        db.query(CertificateRecord)
        .filter(
            CertificateRecord.serial_number == payload.serial_number,
            CertificateRecord.issuer        == payload.issuer,
        )
        .first()
    )

    if certificate is None:
        # Could be: serial doesn't exist at all, or serial exists
        # under a different institution. We don't reveal which.
        internal = _classify_no_record(db, payload)
        return (
            VerificationResponse(
                result=VerificationResult.NOT_VERIFIED,
                message=(
                    "No certificate record was found matching the serial "
                    "number and institution you entered. "
                    "Double-check the serial number on the certificate and "
                    "confirm you have selected the correct institution."
                ),
            ),
            internal,
        )

    # ── Step 2: Check fullname with word-order flexibility ──────────────────
    matched, was_reversed = _name_matches(payload.fullname, certificate.fullname)

    if not matched:
        return (
            VerificationResponse(
                result=VerificationResult.NOT_VERIFIED,
                message=(
                    "The serial number and institution matched a record, "
                    "but the name you entered does not match. "
                    "Make sure you enter the full name exactly as it appears "
                    "on the certificate — including any middle names. "
                    "Check for spelling differences."
                ),
            ),
            InternalVerificationCode.NAME_MISMATCH,
        )

    # ── Step 3: Internal consistency — rehash stored fields ─────────────────
    # Reconstruct hash from stored data. If stored fields have been tampered
    # with, the stored hash will no longer match.
    stored_rehash = hash_certificate(
        serial_number=certificate.serial_number,
        fullname=certificate.fullname,
        program=certificate.program,
        graduation_year=certificate.graduation_year,
        issuer=certificate.issuer,
    )

    if stored_rehash != certificate.certificate_hash:
        return (
            VerificationResponse(
                result=VerificationResult.CANNOT_VERIFY,
                message=(
                    "The certificate record exists but its data does not "
                    "match the original cryptographic fingerprint. "
                    "This indicates the record may have been modified after "
                    "issuance. Contact the issuing institution immediately."
                ),
            ),
            InternalVerificationCode.DATA_TAMPERED,
        )

    # ── Step 4: Merkle proof ─────────────────────────────────────────────────
    merkle_proof = db.query(MerkleProof).filter(
        MerkleProof.certificate_id == certificate.id
    ).first()

    batch = db.query(CertificateBatch).filter(
        CertificateBatch.id == certificate.batch_id
    ).first()

    if not merkle_proof or not batch:
        return (
            VerificationResponse(
                result=VerificationResult.CANNOT_VERIFY,
                message=(
                    "The batch record for this certificate could not be "
                    "located. Contact the issuing institution."
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
                    "The batch containing this certificate has a data "
                    "integrity issue. The record may have been tampered "
                    "with after it was issued. Contact the institution."
                ),
            ),
            InternalVerificationCode.BATCH_TAMPER_DETECTED,
        )

    # ── Step 5: Digital signature ────────────────────────────────────────────
    university = db.query(University).filter(
        University.id == batch.university_id
    ).first()

    if not university or not university.public_key:
        return (
            VerificationResponse(
                result=VerificationResult.CANNOT_VERIFY,
                message=(
                    "The issuing institution could not be confirmed in the "
                    "MerkliFy registry. This certificate cannot be verified."
                ),
            ),
            InternalVerificationCode.UNTRUSTED_ISSUER,
        )

    if university.trust_status != TrustStatus.TRUSTED:
        return (
            VerificationResponse(
                result=VerificationResult.CANNOT_VERIFY,
                message=(
                    f"{university.university_name} is currently not in "
                    "trusted status on MerkliFy. Certificates from this "
                    "institution cannot be verified until trust is restored. "
                    "Contact the institution directly."
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
                    "The digital signature on this batch does not match "
                    f"{university.university_name}'s registered signing key. "
                    "This may indicate the batch was not genuinely issued "
                    "by this institution."
                ),
            ),
            InternalVerificationCode.UNTRUSTED_ISSUER,
        )

    # ── Step 6: Lifecycle status ─────────────────────────────────────────────
    status_record = db.query(CertificateStatus).filter(
        CertificateStatus.certificate_id == certificate.id
    ).first()

    current_status = (
        status_record.current_status
        if status_record
        else CertificateLifecycleStatus.ACTIVE
    )

    # Public fields to return on success/status results
    public_fields = dict(
        serial_number=certificate.serial_number,
        fullname=certificate.fullname,
        program=certificate.program,
        issuer=certificate.issuer,
        graduation_year=certificate.graduation_year,
    )

    if current_status == CertificateLifecycleStatus.REVOKED:
        return (
            VerificationResponse(
                result=VerificationResult.REVOKED,
                message=(
                    "This certificate was issued by "
                    f"{university.university_name} but has since been "
                    "formally revoked. A revoked certificate is no longer "
                    "considered valid. Contact the institution if you "
                    "believe this is an error."
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
                    "This certificate is currently suspended by "
                    f"{university.university_name}. It cannot be treated "
                    "as valid while suspended. Contact the institution "
                    "for more information."
                ),
                **public_fields,
            ),
            InternalVerificationCode.SUSPENDED,
        )

    # All checks passed
    reversed_note = (
        " The name was matched after checking both word orders — "
        "the certificate may list the name differently to how it was entered."
        if was_reversed else ""
    )

    return (
        VerificationResponse(
            result=VerificationResult.AUTHENTIC,
            message=(
                f"This certificate is genuine. It was issued by "
                f"{university.university_name} and is currently active."
                + reversed_note
            ),
            **public_fields,
        ),
        InternalVerificationCode.AUTHENTIC,
    )


def _classify_no_record(
    db: Session,
    payload: VerificationRequest,
) -> InternalVerificationCode:
    """
    Internal classification only — not returned to the caller.
    Determines the real reason for no match.
    """
    # Does the serial exist at all?
    by_serial = db.query(CertificateRecord).filter(
        CertificateRecord.serial_number == payload.serial_number
    ).first()

    if not by_serial:
        return InternalVerificationCode.NOT_FOUND

    # Serial exists but under a different institution
    if by_serial.issuer != payload.issuer:
        return InternalVerificationCode.INSTITUTION_MISMATCH

    return InternalVerificationCode.INPUT_MISMATCH


def _write_log(
    db, payload, internal_code, ip_address
) -> None:
    log = VerificationLog(
        serial_number=payload.serial_number,
        fullname=payload.fullname,
        verification_result=internal_code.value,
        ip_address=ip_address,
    )
    db.add(log)
    try:
        db.commit()
    except Exception:
        db.rollback()