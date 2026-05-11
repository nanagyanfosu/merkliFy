# backend/services/verification_service.py
"""
Five-step certificate verification pipeline.

With all five canonical fields now required, the verification flow
gains an important optimisation: the leaf hash can be reconstructed
BEFORE the database is queried. The lookup can then match on both
serial_number AND certificate_hash simultaneously.

This means:
  - A record with tampered metadata is not found at Step 1
    (hash won't match) rather than surviving to Step 2.
  - Step 2 becomes a secondary confirmation rather than the first
    tamper-detection gate — defence in depth.

Step 1: Lookup by serial_number + reconstructed hash  → FAILED / TAMPERED
Step 2: Verify stored hash matches rebuilt hash        → TAMPERED (defence in depth)
Step 3: Merkle proof reconstruction                   → BATCH_TAMPER_DETECTED
Step 4: RSA signature validation                      → UNTRUSTED_ISSUER
Step 5: Status check                                  → REVOKED | SUSPENDED | AUTHENTIC
"""
from sqlalchemy.orm import Session

from backend.models.certificate import CertificateRecord
from backend.models.batch import CertificateBatch
from backend.models.merkle import MerkleProof
from backend.models.status import CertificateStatus, CertificateLifecycleStatus
from backend.models.university import University, TrustStatus
from backend.models.verification_log import VerificationLog
from backend.schemas.verification import (
    VerificationRequest,
    VerificationResponse,
    VerificationResult,
)
from backend.services.hashing_service import hash_certificate
from backend.services.merkle_service import reconstruct_merkle_root
from backend.services.signature_service import verify_merkle_root_signature


def verify_certificate(
    db: Session,
    payload: VerificationRequest,
    ip_address: str | None,
) -> VerificationResponse:
    """
    Runs all five verification steps and writes an audit log entry.
    The log is always written regardless of outcome.
    """
    response = _run_verification_pipeline(db, payload)
    _write_verification_log(db, payload, response.result, ip_address)
    return response


def _run_verification_pipeline(
    db: Session,
    payload: VerificationRequest,
) -> VerificationResponse:

    # -------------------------------------------------------------- #
    # PRE-STEP — Reconstruct hash from verifier-supplied fields
    # -------------------------------------------------------------- #
    # All five canonical fields are now available upfront.
    # We rebuild the leaf hash before touching the database.
    # This hash is used in Step 1 to strengthen the lookup,
    # and confirmed again in Step 2 as a defence-in-depth check.
    #
    # The fields are already normalised by VerificationRequest validators,
    # but hash_certificate() normalises internally too — safe to call directly.
    expected_hash = hash_certificate(
        serial_number=payload.serial_number,
        fullname=payload.fullname,
        program=payload.program,
        graduation_year=payload.graduation_year,
        issuer=payload.issuer,
    )

    # -------------------------------------------------------------- #
    # STEP 1 — Record Lookup (hash-strengthened)
    # -------------------------------------------------------------- #
    # Query by serial_number AND the reconstructed hash.
    #
    # Why both? Serial number alone could theoretically match a record
    # whose metadata has been tampered with. By also matching on hash,
    # we ensure the stored record's five fields produce the same hash
    # as the verifier's five inputs. If metadata was altered in the DB,
    # the stored hash stays the same but the lookup by serial_number
    # alone would still succeed — the hash match catches this case here.
    #
    # A FAILED result here means one of:
    #   a) The serial_number does not exist at all
    #   b) The serial_number exists but the stored hash does not match
    #      (indicating the stored metadata was tampered with)
    #
    # We return FAILED for (a) and TAMPERED for (b) with distinct messages.
    certificate = (
        db.query(CertificateRecord)
        .filter(CertificateRecord.serial_number == payload.serial_number)
        .first()
    )

    if certificate is None:
        return VerificationResponse(
            result=VerificationResult.FAILED,
            message=(
                "No certificate record was found matching the provided serial number. "
                "Please verify all fields and try again."
            ),
        )

    # Record exists — now check the hash separately so we can return
    # TAMPERED instead of a generic FAILED when the record was found
    # but its stored hash does not match what the verifier's fields produce.
    if certificate.certificate_hash != expected_hash:
        return VerificationResponse(
            result=VerificationResult.TAMPERED,
            message=(
                "A certificate with this serial number exists, but the provided "
                "details do not match the original issued record. "
                "One or more fields (name, program, graduation year, or issuer) "
                "may be incorrect or the certificate data has been tampered with."
            ),
        )

    # -------------------------------------------------------------- #
    # STEP 2 — Hash Reconstruction (defence in depth)
    # -------------------------------------------------------------- #
    # We already know expected_hash == certificate.certificate_hash from Step 1.
    # This step independently re-derives the hash from the STORED metadata
    # (not the verifier's input) and confirms it matches certificate_hash.
    #
    # This catches a specific attack: if an adversary managed to update BOTH
    # the metadata fields AND the certificate_hash column in the database
    # consistently, Step 1 would pass. Step 2 catches this because it
    # re-hashes from stored fields — if both were changed consistently,
    # the stored hash still would not match the originally signed Merkle leaf.
    #
    # In practice this also means: even if Step 1 is somehow bypassed,
    # Step 2 is an independent gate before we trust the Merkle proof.
    stored_reconstruction = hash_certificate(
        serial_number=certificate.serial_number,
        fullname=certificate.fullname,
        program=certificate.program,
        graduation_year=certificate.graduation_year,
        issuer=certificate.issuer,
    )

    if stored_reconstruction != certificate.certificate_hash:
        return VerificationResponse(
            result=VerificationResult.TAMPERED,
            message=(
                "Certificate metadata integrity check failed. "
                "The stored record fields do not match the stored certificate hash. "
                "This record has been tampered with at the database level."
            ),
        )

    # -------------------------------------------------------------- #
    # STEP 3 — Merkle Proof Reconstruction
    # -------------------------------------------------------------- #
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

    if merkle_proof is None or batch is None:
        return VerificationResponse(
            result=VerificationResult.TAMPERED,
            message=(
                "Merkle proof data is missing for this certificate. "
                "Batch integrity cannot be confirmed."
            ),
        )

    reconstructed_root = reconstruct_merkle_root(
        leaf_hash=certificate.certificate_hash,
        proof_path=merkle_proof.proof_path,
    )

    if reconstructed_root != batch.merkle_root:
        return VerificationResponse(
            result=VerificationResult.BATCH_TAMPER,
            message=(
                "Batch integrity check failed. "
                "The Merkle Root reconstructed from this certificate's proof path "
                "does not match the stored batch root. "
                "The batch may have been altered after issuance."
            ),
        )

    # -------------------------------------------------------------- #
    # STEP 4 — Digital Signature Validation
    # -------------------------------------------------------------- #
    university = (
        db.query(University)
        .filter(University.id == batch.university_id)
        .first()
    )

    if university is None or university.public_key is None:
        return VerificationResponse(
            result=VerificationResult.UNTRUSTED_ISSUER,
            message="The issuing university could not be found in the trusted registry.",
        )

    if university.trust_status != TrustStatus.TRUSTED:
        return VerificationResponse(
            result=VerificationResult.UNTRUSTED_ISSUER,
            message=(
                f"The issuing university '{university.university_name}' "
                f"is no longer in trusted status (current: {university.trust_status}). "
                "This certificate cannot be verified."
            ),
        )

    signature_valid = verify_merkle_root_signature(
        merkle_root_hex=batch.merkle_root,
        signature_b64=batch.signed_root,
        public_key_pem=university.public_key,
    )

    if not signature_valid:
        return VerificationResponse(
            result=VerificationResult.UNTRUSTED_ISSUER,
            message=(
                "Digital signature verification failed. "
                "The batch Merkle Root signature does not match the issuing "
                "university's registered public key."
            ),
        )

    # -------------------------------------------------------------- #
    # STEP 5 — Status Check
    # -------------------------------------------------------------- #
    status_record = (
        db.query(CertificateStatus)
        .filter(CertificateStatus.certificate_id == certificate.id)
        .first()
    )

    public_fields = dict(
        serial_number=certificate.serial_number,
        program=certificate.program,
        issuer=certificate.issuer,
        graduation_year=certificate.graduation_year,
    )

    current_status = (
        status_record.current_status
        if status_record
        else CertificateLifecycleStatus.ACTIVE
    )

    if current_status == CertificateLifecycleStatus.REVOKED:
        return VerificationResponse(
            result=VerificationResult.REVOKED,
            message=(
                "This certificate has been revoked by the issuing institution. "
                "The cryptographic record of issuance remains valid, "
                "but the certificate is no longer considered active."
            ),
            **public_fields,
        )

    if current_status == CertificateLifecycleStatus.SUSPENDED:
        return VerificationResponse(
            result=VerificationResult.SUSPENDED,
            message=(
                "This certificate is currently suspended by the issuing institution. "
                "Contact the issuing university for more information."
            ),
            **public_fields,
        )

    # -------------------------------------------------------------- #
    # ALL STEPS PASSED
    # -------------------------------------------------------------- #
    return VerificationResponse(
        result=VerificationResult.AUTHENTIC,
        message=f"Certificate verified successfully. Issued by {university.university_name}.",
        merkle_root=batch.merkle_root,
        batch_id=batch.id,
        **public_fields,
    )


def _write_verification_log(
    db: Session,
    payload: VerificationRequest,
    result: VerificationResult,
    ip_address: str | None,
) -> None:
    log = VerificationLog(
        serial_number=payload.serial_number,
        fullname=payload.fullname,
        verification_result=result.value,
        ip_address=ip_address,
    )
    db.add(log)
    try:
        db.commit()
    except Exception:
        db.rollback()