from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from backend.models.batch import CertificateBatch
from backend.models.certificate import CertificateRecord
from backend.models.merkle import MerkleProof
from backend.models.status import CertificateStatus, CertificateLifecycleStatus
from backend.models.user import User
from backend.schemas.certificate import CertificateRowInput, BatchUploadResponse
from backend.services.hashing_service import hash_certificate
from backend.services.merkle_service import build_merkle_tree
from backend.services.signature_service import sign_merkle_root
from backend.services.issuer_registry_service import get_university_for_signing


def process_batch(
    db:             Session,
    university_id:  int,
    batch_name:     str,
    academic_year:  int,
    validated_rows: list[CertificateRowInput],
    uploaded_by:    int | None = None,    # user.id of the issuer uploading
) -> BatchUploadResponse:
    """
    Full certificate issuance pipeline.
    uploaded_by stores the issuer's user.id on the batch record.
    If None, the batch has no attribution (pre-system data).
    """
    university = get_university_for_signing(db, university_id)
    canonical_issuer = university.university_name.strip().lower()

    # Duplicate serial check
    incoming_serials = [row.serial_number for row in validated_rows]
    conflicts = (
        db.query(CertificateRecord.serial_number)
        .filter(
            CertificateRecord.university_id == university_id,
            CertificateRecord.serial_number.in_(incoming_serials),
        )
        .all()
    )
    if conflicts:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "These serial numbers already exist for your institution.",
                "duplicates": [r.serial_number for r in conflicts],
            },
        )

    # Hash every certificate
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
        batch = _persist_batch(
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
            uploaded_by=uploaded_by,      # passed through — must not be dropped
        )
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Database constraint error: {str(e.orig)}",
        )

    return BatchUploadResponse(
        batch_id=batch.id,
        batch_name=batch.batch_name,
        academic_year=batch.academic_year,
        total_certificates=batch.total_certificates,
        message=(
            f"Batch '{batch_name}' issued. "
            f"{len(validated_rows)} certificate(s) committed."
        ),
    )


def _persist_batch(
    db,
    university_id,
    batch_name,
    academic_year,
    merkle_root,
    signed_root,
    validated_rows,
    leaf_hashes,
    proof_paths,
    canonical_issuer,
    uploaded_by,          # ← stored on the CertificateBatch row
):
    batch = CertificateBatch(
        university_id=university_id,
        batch_name=batch_name,
        academic_year=academic_year,
        merkle_root=merkle_root,
        signed_root=signed_root,
        total_certificates=len(validated_rows),
        uploaded_by=uploaded_by,          # ← written to DB here
    )
    db.add(batch)
    db.flush()  # gives us batch.id before committing

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
            student_id=getattr(row, "student_id", None),
            classification=getattr(row, "classification", None),
            issue_date=getattr(row, "issue_date", None),
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
    db.refresh(batch)
    return batch

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

    if academic_year is not None:
        query = query.filter(CertificateBatch.academic_year == int(academic_year))

    allowed_sort = {"batch_name", "academic_year", "created_at", "total_certificates"}
    if sort_by not in allowed_sort:
        sort_by = "created_at"

    col = getattr(CertificateBatch, sort_by)
    query = query.order_by(col.desc() if sort_dir == "desc" else col.asc())

    batches = query.all()

    # Fetch all uploaders in one query — avoid N+1
    uploader_ids = list({b.uploaded_by for b in batches if b.uploaded_by})
    uploader_map = {}
    if uploader_ids:
        uploaders = db.query(User).filter(User.id.in_(uploader_ids)).all()
        uploader_map = {
            u.id: {
                "name": u.issuer_name or u.department or u.email,
                "department": u.department,
                "department_code": u.department_code,
            }
            for u in uploaders
        }

    return [
        {
            "batch_id":           b.id,
            "batch_name":         b.batch_name,
            "academic_year":      b.academic_year,
            "total_certificates": b.total_certificates,
            "created_at":         b.created_at.isoformat(),
            "uploaded_by_id":     b.uploaded_by,
            "uploaded_by_name":   uploader_map.get(
                b.uploaded_by, {}
            ).get("name", "Unknown"),
            "uploaded_by_dept":   uploader_map.get(
                b.uploaded_by, {}
            ).get("department", ""),
        }
        for b in batches
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

    
def _resolve_uploader(user: "User | None") -> dict:
    """
    Returns the best available display name for an uploader.
    Fallback chain: issuer_name → department → email → "Registrar"
    We never return "Unknown" — we always have the email at minimum.
    """
    if not user:
        return {
            "name":            "Registrar (pre-system)",
            "department":      "",
            "department_code": "",
            "email":           "",
        }
    return {
        "name":            user.issuer_name or user.department or user.email,
        "department":      user.department or "",
        "department_code": user.department_code or "",
        "email":           user.email,
    }


def get_batches_for_university(
    db:            "Session",
    university_id: int,
    academic_year: int | None = None,
    sort_by:       str        = "created_at",
    sort_dir:      str        = "desc",
    uploaded_by:   int | None = None,  # NEW — filter to specific issuer
) -> list[dict]:
    query = db.query(CertificateBatch).filter(
        CertificateBatch.university_id == university_id
    )

    if academic_year is not None:
        query = query.filter(CertificateBatch.academic_year == int(academic_year))

    # Optional: filter to a single issuer's uploads
    if uploaded_by is not None:
        query = query.filter(CertificateBatch.uploaded_by == uploaded_by)

    allowed_sort = {"batch_name", "academic_year", "created_at", "total_certificates"}
    if sort_by not in allowed_sort:
        sort_by = "created_at"

    col = getattr(CertificateBatch, sort_by)
    query = query.order_by(col.desc() if sort_dir == "desc" else col.asc())

    batches = query.all()

    # Bulk-load all uploaders in ONE query
    uploader_ids = list({b.uploaded_by for b in batches if b.uploaded_by})
    uploader_map: dict[int, dict] = {}
    if uploader_ids:
        from backend.models.user import User
        users = db.query(User).filter(User.id.in_(uploader_ids)).all()
        uploader_map = {u.id: _resolve_uploader(u) for u in users}

    return [
        {
            "batch_id":             b.id,
            "batch_name":           b.batch_name,
            "academic_year":        b.academic_year,
            "total_certificates":   b.total_certificates,
            "created_at":           b.created_at.isoformat(),
            "uploaded_by_id":       b.uploaded_by,
            # Always use the resolved name — never "Unknown"
            "uploaded_by_name":     uploader_map.get(
                b.uploaded_by, _resolve_uploader(None)
            )["name"] if b.uploaded_by else "Registrar (pre-system)",
            "uploaded_by_dept":     uploader_map.get(
                b.uploaded_by, _resolve_uploader(None)
            )["department"] if b.uploaded_by else "",
            "uploaded_by_email":    uploader_map.get(
                b.uploaded_by, _resolve_uploader(None)
            )["email"] if b.uploaded_by else "",
        }
        for b in batches
    ]


def delete_batch(db: Session, batch_id: int, requesting_user: User) -> dict:
    """
    Deletes a batch and every record associated with it.

    Rules:
      - Issuers can only delete batches they personally uploaded
        (batch.uploaded_by == requesting_user.id)
      - No other issuer can delete another issuer's batch
      - Admins do not have delete access through this system —
        deletion is an issuer self-service action only

    What gets deleted (in order, to respect foreign key constraints):
      1. certificate_status_history rows for each cert in the batch
      2. certificate_status rows for each cert
      3. merkle_proofs rows for each cert
      4. certificate_records rows
      5. the certificate_batches row itself

    After deletion, any public verification attempt for these serial
    numbers will return NOT_VERIFIED.
    """
    from backend.models.merkle import MerkleProof
    from backend.models.status import CertificateStatus, CertificateStatusHistory

    # Fetch the batch
    batch = db.query(CertificateBatch).filter(
        CertificateBatch.id == batch_id
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found.")

    # Confirm it belongs to this issuer's university
    if batch.university_id != requesting_user.university_id:
        raise HTTPException(
            status_code=403,
            detail="This batch does not belong to your institution."
        )

    # Confirm this issuer uploaded it
    if batch.uploaded_by != requesting_user.id:
        raise HTTPException(
            status_code=403,
            detail=(
                "You can only delete batches you uploaded. "
                "This batch was uploaded by another department."
            ),
        )

    # Collect all cert IDs in this batch
    cert_ids = [
        row[0]
        for row in db.query(CertificateRecord.id)
        .filter(CertificateRecord.batch_id == batch_id)
        .all()
    ]

    total_certs = len(cert_ids)
    batch_name  = batch.batch_name

    if cert_ids:
        # Step 1 — delete history entries
        db.query(CertificateStatusHistory).filter(
            CertificateStatusHistory.certificate_id.in_(cert_ids)
        ).delete(synchronize_session=False)

        # Step 2 — delete status entries
        db.query(CertificateStatus).filter(
            CertificateStatus.certificate_id.in_(cert_ids)
        ).delete(synchronize_session=False)

        # Step 3 — delete Merkle proof entries
        db.query(MerkleProof).filter(
            MerkleProof.certificate_id.in_(cert_ids)
        ).delete(synchronize_session=False)

        # Step 4 — delete the certificate records
        db.query(CertificateRecord).filter(
            CertificateRecord.batch_id == batch_id
        ).delete(synchronize_session=False)

    # Step 5 — delete the batch itself
    db.delete(batch)
    db.commit()

    return {
        "message": (
            f"Batch '{batch_name}' and all {total_certs} associated "
            f"certificate records have been permanently deleted."
        ),
        "deleted_certificates": total_certs,
    }