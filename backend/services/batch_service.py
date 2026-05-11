# backend/services/batch_service.py
"""
Batch processing pipeline.

Orchestrates the full certificate issuance flow:

  validated rows
      → hash each certificate          (hashing_service)
      → build Merkle Tree              (merkle_service)
      → sign the Merkle Root           (signature_service)
      → atomic DB commit               (batch_service — this module)
          ├── certificate_batches      (one row)
          ├── certificate_records      (one row per cert)
          ├── merkle_proofs            (one row per cert)
          └── certificate_status       (one ACTIVE row per cert)

ATOMICITY GUARANTEE:
  All DB writes happen inside a single transaction.
  If anything fails after partial writes, the entire transaction rolls back.
  The issuer either gets a complete batch or nothing — never a partial state.

IMMUTABILITY GUARANTEE:
  Once committed, certificate_records and merkle_proofs are never modified.
  certificate_batches.merkle_root and signed_root are never modified.
  Only certificate_status rows are mutable (lifecycle management, Phase 5).
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from backend.models.batch import CertificateBatch
from backend.models.certificate import CertificateRecord
from backend.models.merkle import MerkleProof
from backend.models.status import CertificateStatus, CertificateLifecycleStatus
from backend.schemas.certificate import CertificateRowInput, BatchUploadResponse
from backend.services.hashing_service import hash_certificate
from backend.services.merkle_service import build_merkle_tree_clean
from backend.services.signature_service import sign_merkle_root
from backend.services.issuer_registry_service import get_university_for_signing


def process_batch(
    db: Session,
    university_id: int,
    batch_name: str,
    validated_rows: list[CertificateRowInput],
) -> BatchUploadResponse:
    """
    Runs the full issuance pipeline for a validated set of certificate rows.

    Args:
        db:             Active SQLAlchemy session.
        university_id:  The issuing university's ID (from JWT token).
        batch_name:     Human-readable name for this batch (e.g. "2025 Graduates").
        validated_rows: Output of upload_service.parse_upload().

    Returns:
        BatchUploadResponse with batch_id, merkle_root, and count.

    Raises:
        HTTPException(403) if the university is not trusted.
        HTTPException(409) if any serial_number already exists in the database.
        HTTPException(500) on unexpected commit failure.
    """

    # ------------------------------------------------------------------ #
    # STEP 1 — Verify university is trusted and has a signing key
    # ------------------------------------------------------------------ #
    university = get_university_for_signing(db, university_id)

    # ------------------------------------------------------------------ #
    # STEP 2 — Hash every certificate
    # ------------------------------------------------------------------ #
    # We hash in the exact same way verification will later reconstruct:
    # using the five canonical fields only.
    leaf_hashes: list[str] = []
    for row in validated_rows:
        h = hash_certificate(
            serial_number=row.serial_number,
            fullname=row.fullname,
            program=row.program,
            graduation_year=row.graduation_year,
            issuer=row.issuer,
        )
        leaf_hashes.append(h)

    # ------------------------------------------------------------------ #
    # STEP 3 — Build Merkle Tree
    # ------------------------------------------------------------------ #
    merkle_root, proof_paths = build_merkle_tree_clean(leaf_hashes)
    # merkle_root:  single hex string committing to the whole batch
    # proof_paths:  list[list[dict]], one proof path per certificate

    # ------------------------------------------------------------------ #
    # STEP 4 — Sign the Merkle Root with the university's private key
    # ------------------------------------------------------------------ #
    # sign_merkle_root() decrypts the key internally, signs, discards key.
    signed_root = sign_merkle_root(merkle_root, university)

    # ------------------------------------------------------------------ #
    # STEP 5 — Persist everything atomically
    # ------------------------------------------------------------------ #
    try:
        batch, cert_records = _persist_batch(
            db=db,
            university_id=university_id,
            batch_name=batch_name,
            merkle_root=merkle_root,
            signed_root=signed_root,
            validated_rows=validated_rows,
            leaf_hashes=leaf_hashes,
            proof_paths=proof_paths,
        )
    except IntegrityError as e:
        db.rollback()
        # Most likely cause: duplicate serial_number already in another batch
        raise HTTPException(
            status_code=409,
            detail=(
                "One or more serial_numbers in this batch already exist in the database. "
                "Each certificate must have a globally unique serial_number. "
                f"DB detail: {str(e.orig)}"
            ),
        )

    return BatchUploadResponse(
        batch_id=batch.id,
        batch_name=batch.batch_name,
        merkle_root=batch.merkle_root,
        total_certificates=batch.total_certificates,
        message=(
            f"Batch '{batch_name}' successfully issued. "
            f"{len(cert_records)} certificate(s) cryptographically committed."
        ),
    )


def _persist_batch(
    db: Session,
    university_id: int,
    batch_name: str,
    merkle_root: str,
    signed_root: str,
    validated_rows: list[CertificateRowInput],
    leaf_hashes: list[str],
    proof_paths: list[list[dict]],
) -> tuple[CertificateBatch, list[CertificateRecord]]:
    """
    Writes all batch data inside a single transaction.

    Write order:
      1. certificate_batches    — needs to exist before records can FK to it
      2. certificate_records    — need to exist before proofs/status can FK to them
      3. merkle_proofs          — one per record
      4. certificate_status     — one ACTIVE row per record

    The session is flushed (not committed) after each group so that
    auto-generated IDs are available for the next group's foreign keys,
    while the full commit happens only once at the end.
    """

    # 1. Create the batch record
    batch = CertificateBatch(
        university_id=university_id,
        batch_name=batch_name,
        merkle_root=merkle_root,
        signed_root=signed_root,
        total_certificates=len(validated_rows),
    )
    db.add(batch)
    db.flush()   # populates batch.id without committing

    # 2. Create all certificate records
    cert_records: list[CertificateRecord] = []
    for row, leaf_hash in zip(validated_rows, leaf_hashes):
        record = CertificateRecord(
            batch_id=batch.id,
            serial_number=row.serial_number,
            fullname=row.fullname,
            program=row.program,
            graduation_year=row.graduation_year,
            issuer=row.issuer,
            student_id=row.student_id,
            classification=row.classification,
            issue_date=row.issue_date,
            certificate_hash=leaf_hash,
        )
        db.add(record)
        cert_records.append(record)

    db.flush()   # populates record.id for each cert

    # 3. Create Merkle proofs + 4. Create initial ACTIVE status
    for record, proof_path in zip(cert_records, proof_paths):
        proof = MerkleProof(
            certificate_id=record.id,
            proof_path=proof_path,       # stored as JSON
            leaf_index=cert_records.index(record),
        )
        db.add(proof)

        status = CertificateStatus(
            certificate_id=record.id,
            current_status=CertificateLifecycleStatus.ACTIVE,
        )
        db.add(status)

    # Single commit — all or nothing
    db.commit()

    return batch, cert_records


def get_batches_for_university(db: Session, university_id: int) -> list[dict]:
    """
    Returns a summary list of all batches issued by a university.
    Used by the issuer dashboard.
    """
    batches = (
        db.query(CertificateBatch)
        .filter(CertificateBatch.university_id == university_id)
        .order_by(CertificateBatch.created_at.desc())
        .all()
    )
    return [
        {
            "batch_id": b.id,
            "batch_name": b.batch_name,
            "merkle_root": b.merkle_root,
            "total_certificates": b.total_certificates,
            "created_at": b.created_at.isoformat(),
        }
        for b in batches
    ]


def get_batch_detail(db: Session, batch_id: int, university_id: int) -> dict:
    """
    Returns full detail for a single batch including all certificate records.
    Scoped to the requesting university — an issuer cannot view another
    university's batches.
    """
    batch = (
        db.query(CertificateBatch)
        .filter(
            CertificateBatch.id == batch_id,
            CertificateBatch.university_id == university_id,
        )
        .first()
    )
    if not batch:
        raise HTTPException(
            status_code=404,
            detail=f"Batch {batch_id} not found or does not belong to your institution.",
        )

    certificates = (
        db.query(CertificateRecord)
        .filter(CertificateRecord.batch_id == batch_id)
        .all()
    )

    return {
        "batch_id": batch.id,
        "batch_name": batch.batch_name,
        "merkle_root": batch.merkle_root,
        "total_certificates": batch.total_certificates,
        "created_at": batch.created_at.isoformat(),
        "certificates": [
            {
                "id": c.id,
                "serial_number": c.serial_number,
                "fullname": c.fullname,
                "program": c.program,
                "graduation_year": c.graduation_year,
                "issuer": c.issuer,
                "certificate_hash": c.certificate_hash,
                "student_id": c.student_id,
                "classification": c.classification,
                "issue_date": c.issue_date,
            }
            for c in certificates
        ],
    }