from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from backend.models.batch import CertificateBatch
from backend.models.certificate import CertificateRecord
from backend.models.merkle import MerkleProof
from backend.models.status import CertificateStatus, CertificateLifecycleStatus
from backend.schemas.certificate import CertificateRowInput, BatchUploadResponse
from backend.services.hashing_service import hash_certificate
from backend.services.merkle_service import build_merkle_tree
from backend.services.signature_service import sign_merkle_root
from backend.services.issuer_registry_service import get_university_for_signing


def process_batch(
    db: Session,
    university_id: int,
    batch_name: str,
    academic_year: int,
    validated_rows: list[CertificateRowInput],
    uploaded_by: int | None = None,
) -> BatchUploadResponse:
    university = get_university_for_signing(db, university_id)

    # The authoritative issuer string — sourced from DB, not CSV
    canonical_issuer = university.university_name.strip().lower()

    # Check for serial number duplicates within this university
    incoming_serials = [row.serial_number for row in validated_rows]
    already_exists = (
        db.query(CertificateRecord.serial_number)
        .filter(
            CertificateRecord.university_id == university_id,
            CertificateRecord.serial_number.in_(incoming_serials),
        )
        .all()
    )
    if already_exists:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "These serial numbers already exist for your institution.",
                "duplicates": [r.serial_number for r in already_exists],
            },
        )


    leaf_hashes = [
        hash_certificate(
            serial_number=row.serial_number,
            fullname=row.fullname,
            program=row.program,
            graduation_year=row.graduation_year,
            issuer=canonical_issuer,       
        )
        for row in validated_rows
    ]

    merkle_root, proof_paths = build_merkle_tree(leaf_hashes)
    signed_root = sign_merkle_root(merkle_root, university)

    try:
        batch, cert_records = _persist_batch(
            db=db,
            university_id=university_id,
            batch_name=batch_name,
            academic_year=academic_year,
            merkle_root=merkle_root,
            signed_root=signed_root,
            validated_rows=validated_rows,
            leaf_hashes=leaf_hashes,
            proof_paths=proof_paths,
            canonical_issuer=canonical_issuer,
            uploaded_by=uploaded_by,
        )
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Database constraint violation: {str(e.orig)}",
        )

    return BatchUploadResponse(
        batch_id=batch.id,
        batch_name=batch.batch_name,
        academic_year=batch.academic_year,
        total_certificates=batch.total_certificates,
        message=(
            f"Batch '{batch_name}' issued. "
            f"{len(cert_records)} certificate(s) cryptographically committed."
        ),
    )


def _persist_batch(
    db, university_id, batch_name, academic_year,
    merkle_root, signed_root, validated_rows,
    leaf_hashes, proof_paths, canonical_issuer, uploaded_by,
):
    batch = CertificateBatch(
        university_id=university_id,
        batch_name=batch_name,
        academic_year=academic_year,
        merkle_root=merkle_root,
        signed_root=signed_root,
        total_certificates=len(validated_rows),
        uploaded_by=uploaded_by,
    )
    db.add(batch)
    db.flush()

    cert_records = []
    for row, leaf_hash in zip(validated_rows, leaf_hashes):
        record = CertificateRecord(
            batch_id=batch.id,
            university_id=university_id,
            serial_number=row.serial_number,
            fullname=row.fullname,
            program=row.program,
            graduation_year=row.graduation_year,
            issuer=canonical_issuer,    
            student_id=row.student_id,
            classification=row.classification,
            issue_date=row.issue_date,
            certificate_hash=leaf_hash,
        )
        db.add(record)
        cert_records.append(record)

    db.flush()

    for i, (record, proof_path) in enumerate(zip(cert_records, proof_paths)):
        db.add(MerkleProof(
            certificate_id=record.id,
            proof_path=proof_path,
            leaf_index=i,
        ))
        db.add(CertificateStatus(
            certificate_id=record.id,
            current_status=CertificateLifecycleStatus.ACTIVE,
        ))

    db.commit()
    return batch, cert_records


def get_batches_for_university(
    db: Session,
    university_id: int,
    academic_year: int | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
) -> list[dict]:
    query = db.query(CertificateBatch).filter(
        CertificateBatch.university_id == university_id
    )

    # Explicit int comparison — no ambiguity between string and int
    if academic_year is not None:
        query = query.filter(CertificateBatch.academic_year == int(academic_year))

    allowed_sort = {"batch_name", "academic_year", "created_at", "total_certificates"}
    if sort_by not in allowed_sort:
        sort_by = "created_at"

    col = getattr(CertificateBatch, sort_by)
    query = query.order_by(col.desc() if sort_dir == "desc" else col.asc())

    return [
        {
            "batch_id":           b.id,
            "batch_name":         b.batch_name,
            "academic_year":      b.academic_year,
            "total_certificates": b.total_certificates,
            "created_at":         b.created_at.isoformat(),
        }
        for b in query.all()
    ]

def get_batch_detail(db, batch_id: int, university_id: int):
    """Return full detail for a single batch scoped to a university."""
    batch = (
        db.query(CertificateBatch)
        .filter(
            CertificateBatch.id == batch_id,
            CertificateBatch.university_id == university_id,
        )
        .first()
    )
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    certs = (
        db.query(CertificateRecord)
        .filter(CertificateRecord.batch_id == batch.id)
        .order_by(CertificateRecord.id.asc())
        .all()
    )

    cert_list = []
    for c in certs:
        proof = c.merkle_proof
        status = c.status
        cert_list.append({
            "id": c.id,
            "serial_number": c.serial_number,
            "fullname": c.fullname,
            "program": c.program,
            "graduation_year": c.graduation_year,
            "issuer": c.issuer,
            "student_id": c.student_id,
            "classification": c.classification,
            "issue_date": c.issue_date,
            "certificate_hash": c.certificate_hash,
            "leaf_index": proof.leaf_index if proof else None,
            "proof_path": proof.proof_path if proof else None,
            "current_status": (status.current_status.value if status and hasattr(status.current_status, 'value') else (status.current_status if status else None)),
            "created_at": c.created_at.isoformat(),
        })

    return {
        "batch_id": batch.id,
        "batch_name": batch.batch_name,
        "academic_year": batch.academic_year,
        "total_certificates": batch.total_certificates,
        "created_at": batch.created_at.isoformat(),
        "certificates": cert_list,
    }