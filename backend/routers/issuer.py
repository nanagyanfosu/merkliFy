from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_issuer
from backend.models.user import User
from backend.models.batch import CertificateBatch
from backend.models.certificate import CertificateRecord
from backend.schemas.certificate import BatchUploadResponse
from backend.models.status import (
    CertificateStatus, CertificateStatusHistory,
    CertificateLifecycleStatus,
)
from backend.models.certificate import CertificateRecord
from backend.models.batch import CertificateBatch
from backend.schemas.status import (
    StatusChangeRequest,
    StatusChangeResponse,
    CertificateStatusResponse,
    CertificateSearchRequest,
)
from backend.services import upload_service, batch_service, status_service

router = APIRouter(prefix="/issuer", tags=["issuer"])


# BATCH UPLOAD 
@router.post(
    "/batches/upload",
    response_model=BatchUploadResponse,
    summary="Upload a certificate batch (CSV or JSON)",
)
async def upload_batch(
    file: UploadFile = File(...),
    batch_name: str = Form(...),
    academic_year: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    if current_user.university_id is None:
        raise HTTPException(status_code=403, detail="Account not linked to a university.")
    if current_user.is_temp_password:
        raise HTTPException(status_code=403, detail="Change your temporary password first.")

    raw_bytes = await file.read()
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    validated_rows = upload_service.parse_upload(file, raw_bytes)
    return batch_service.process_batch(
        db=db,
        university_id=current_user.university_id,
        batch_name=batch_name,
        academic_year=academic_year,
        validated_rows=validated_rows,
    )


@router.get("/status-stats")
def get_status_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    """Certificate status breakdown for the issuer's institution."""
    if not current_user.university_id:
        return {"active": 0, "revoked": 0, "suspended": 0}

    records = (
        db.query(CertificateStatus)
        .join(CertificateRecord,
              CertificateStatus.certificate_id == CertificateRecord.id)
        .filter(CertificateRecord.university_id == current_user.university_id)
        .all()
    )

    active    = sum(1 for r in records
                    if r.current_status == CertificateLifecycleStatus.ACTIVE)
    revoked   = sum(1 for r in records
                    if r.current_status == CertificateLifecycleStatus.REVOKED)
    suspended = sum(1 for r in records
                    if r.current_status == CertificateLifecycleStatus.SUSPENDED)

    return {"active": active, "revoked": revoked, "suspended": suspended}


@router.get("/recent-activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    """Last 10 certificate status changes for this institution."""
    if not current_user.university_id:
        return []

    rows = (
        db.query(CertificateStatusHistory, CertificateRecord)
        .join(CertificateRecord,
              CertificateStatusHistory.certificate_id == CertificateRecord.id)
        .filter(CertificateRecord.university_id == current_user.university_id)
        .order_by(CertificateStatusHistory.changed_at.desc())
        .limit(10)
        .all()
    )

    return [
        {
            "certificate_id": cert.id,
            "serial_number":  cert.serial_number,
            "fullname":       cert.fullname,
            "old_status":     hist.old_status,
            "new_status":     hist.new_status,
            "reason":         hist.reason,
            "changed_at":     hist.changed_at.isoformat(),
        }
        for hist, cert in rows
    ]



@router.get("/batches", summary="List all batches for this university")
def list_batches(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    if current_user.university_id is None:
        raise HTTPException(status_code=403, detail="Account not linked to a university.")
    return batch_service.get_batches_for_university(db, current_user.university_id)


@router.get("/batches/{batch_id}", summary="Get full detail for a single batch")
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    if current_user.university_id is None:
        raise HTTPException(status_code=403, detail="Account not linked to a university.")
    return batch_service.get_batch_detail(db, batch_id, current_user.university_id)


# CERTIFICATE SEARCH
@router.post(
    "/certificates/search",
    summary="Search certificates by name, serial number, or program",
    description=(
        "Used on the issuer dashboard to find a certificate before "
        "performing a lifecycle action. Returns paginated results scoped "
        "to this issuer's university. At least one search field is required."
    ),
)
def search_certificates(
    search: CertificateSearchRequest,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    return status_service.search_certificates(
        db=db,
        search=search,
        requesting_user=current_user,
        limit=limit,
        offset=offset,
    )


# CERTIFICATE STATUS MANAGEMENT
@router.get(
    "/certificates/{certificate_id}/status",
    response_model=CertificateStatusResponse,
    summary="Get status and full audit history for a certificate",
    description=(
        "Returns the certificate's current lifecycle status and its complete "
        "change history. Used to review a certificate's record before "
        "making a revocation or suspension decision."
    ),
)
def get_certificate_status(
    certificate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    return status_service.get_certificate_status_detail(
        db=db,
        certificate_id=certificate_id,
        requesting_user=current_user,
    )


@router.patch(
    "/certificates/{certificate_id}/status",
    response_model=StatusChangeResponse,
    summary="Change a certificate's lifecycle status",
    description=(
        "Revoke, suspend, or reinstate a certificate. "
        "Revocation is terminal and cannot be undone. "
        "Suspended certificates can be reinstated or escalated to revoked. "
        "Every change is permanently recorded in the audit trail."
    ),
)
def change_certificate_status(
    certificate_id: int,
    payload: StatusChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    return status_service.change_certificate_status(
        db=db,
        certificate_id=certificate_id,
        payload=payload,
        requesting_user=current_user,
    )


@router.get(
    "/audit-history",
    summary="Full status change audit history for this university",
    description=(
        "Returns a paginated log of all certificate status changes "
        "made within this issuer's university, ordered most recent first."
    ),
)
def get_audit_history(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    if current_user.university_id is None:
        raise HTTPException(status_code=403, detail="Account not linked to a university.")
    return status_service.get_status_history_for_university(
        db=db,
        university_id=current_user.university_id,
        requesting_user=current_user,
        limit=limit,
        offset=offset,
    )

@router.get("/stats")
def get_issuer_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    """Returns upload statistics for the issuer's profile page."""
    if not current_user.university_id:
        return {"total_batches": 0, "total_certificates": 0}

    total_batches = db.query(CertificateBatch).filter(
        CertificateBatch.university_id == current_user.university_id
    ).count()

    total_certs = db.query(CertificateRecord).filter(
        CertificateRecord.university_id == current_user.university_id
    ).count()

    return {
        "total_batches":      total_batches,
        "total_certificates": total_certs,
    }

# Append to backend/routers/issuer.py

@router.get("/stats/extended")
def get_extended_stats(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_issuer),
):
    """Extended statistics for the issuer settings page."""
    if not current_user.university_id:
        return {}

    from backend.models.certificate import CertificateRecord
    from backend.models.batch import CertificateBatch
    from backend.models.status import (
        CertificateStatus, CertificateStatusHistory,
        CertificateLifecycleStatus,
    )
    from backend.models.university import University
    from backend.models.verification_log import VerificationLog
    from sqlalchemy import func as sqlfunc

    uid = current_user.university_id

    # Total batches and certs
    total_batches = db.query(CertificateBatch).filter(
        CertificateBatch.university_id == uid
    ).count()

    total_certs = db.query(CertificateRecord).filter(
        CertificateRecord.university_id == uid
    ).count()

    # Status breakdown
    statuses = (
        db.query(CertificateStatus)
        .join(CertificateRecord,
              CertificateStatus.certificate_id == CertificateRecord.id)
        .filter(CertificateRecord.university_id == uid)
        .all()
    )
    active    = sum(1 for s in statuses if s.current_status == CertificateLifecycleStatus.ACTIVE)
    revoked   = sum(1 for s in statuses if s.current_status == CertificateLifecycleStatus.REVOKED)
    suspended = sum(1 for s in statuses if s.current_status == CertificateLifecycleStatus.SUSPENDED)

    # Revocation rate
    revocation_rate = round((revoked / total_certs) * 100, 1) if total_certs > 0 else 0

    # Average certs per batch
    avg_per_batch = round(total_certs / total_batches, 1) if total_batches > 0 else 0

    # Most active academic year
    year_row = (
        db.query(CertificateBatch.academic_year,
                 sqlfunc.count(CertificateRecord.id).label("cnt"))
        .join(CertificateRecord,
              CertificateBatch.id == CertificateRecord.batch_id)
        .filter(CertificateBatch.university_id == uid)
        .group_by(CertificateBatch.academic_year)
        .order_by(sqlfunc.count(CertificateRecord.id).desc())
        .first()
    )
    most_active_year = year_row.academic_year if year_row else None

    # Verifications for this institution's certs (count from logs)
    # Match by issuer name (lowercased university name)
    issuer_name_lower = (
        db.query(University)
        .filter(University.id == uid)
        .first()
    )
    verif_count = 0
    if issuer_name_lower:
        verif_count = db.query(VerificationLog).filter(
            VerificationLog.serial_number.in_(
                db.query(CertificateRecord.serial_number).filter(
                    CertificateRecord.university_id == uid
                )
            )
        ).count()

    # Last batch date
    last_batch = (
        db.query(CertificateBatch)
        .filter(CertificateBatch.university_id == uid)
        .order_by(CertificateBatch.created_at.desc())
        .first()
    )

    # Revocations performed by this specific issuer account
    revocations_by_me = (
        db.query(CertificateStatusHistory)
        .filter(
            CertificateStatusHistory.changed_by == current_user.id,
            CertificateStatusHistory.new_status == "REVOKED",
        )
        .count()
    )

    return {
        "total_batches":      total_batches,
        "total_certificates": total_certs,
        "active":             active,
        "revoked":            revoked,
        "suspended":          suspended,
        "revocation_rate":    revocation_rate,
        "avg_per_batch":      avg_per_batch,
        "most_active_year":   most_active_year,
        "verifications_received": verif_count,
        "revocations_by_me":  revocations_by_me,
        "last_batch_name":    last_batch.batch_name if last_batch else None,
        "last_batch_date":    last_batch.created_at.isoformat() if last_batch else None,
    }

@router.post("/batches/upload", response_model=BatchUploadResponse)
async def upload_batch(
    file:          UploadFile = File(...),
    batch_name:    str = Form(...),
    academic_year: int = Form(..., ge=1900, le=2100),
    db:            Session = Depends(get_db),
    current_user:  User = Depends(require_issuer),
):
    if current_user.university_id is None:
        raise HTTPException(status_code=403, detail="Account not linked to a university.")
    if current_user.is_temp_password:
        raise HTTPException(status_code=403, detail="Change your temporary password first.")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    validated_rows = upload_service.parse_upload(file, raw_bytes)
    return batch_service.process_batch(
        db=db,
        university_id=current_user.university_id,
        batch_name=batch_name,
        academic_year=academic_year,
        validated_rows=validated_rows,
        uploaded_by=current_user.id,         
    )


@router.get("/certificates/batches-summary")
def get_batches_cert_summary(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_issuer),
):
    """
    Returns all batches for this issuer's university with cert counts.
    Used to build the left-side batch list.
    """
    if not current_user.university_id:
        return []

    batches = db.query(CertificateBatch).filter(
        CertificateBatch.university_id == current_user.university_id
    ).order_by(CertificateBatch.academic_year.desc(),
               CertificateBatch.created_at.desc()).all()

    result = []
    for b in batches:
        cert_count = db.query(CertificateRecord).filter(
            CertificateRecord.batch_id == b.id
        ).count()

        uploader = None
        if b.uploaded_by:
            u = db.query(User).filter(User.id == b.uploaded_by).first()
            if u:
                uploader = u.department or u.issuer_name or u.email

        result.append({
            "batch_id":         b.id,
            "batch_name":       b.batch_name,
            "academic_year":    b.academic_year,
            "cert_count":       cert_count,
            "uploaded_by_dept": uploader or "—",
            "created_at":       b.created_at.isoformat(),
        })

    return result


@router.get("/certificates/by-batch/{batch_id}")
def get_certs_by_batch(
    batch_id:     int,
    limit:        int     = Query(default=100, le=500),
    offset:       int     = Query(default=0, ge=0),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(require_issuer),
):
    """Returns all certificates in a batch. Scoped to this university."""
    batch = db.query(CertificateBatch).filter(
        CertificateBatch.id == batch_id,
        CertificateBatch.university_id == current_user.university_id,
    ).first()

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found or does not belong to your institution."
        )

    records = (
        db.query(CertificateRecord)
        .filter(CertificateRecord.batch_id == batch_id)
        .order_by(CertificateRecord.serial_number.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    cert_ids   = [r.id for r in records]
    status_map = {
        s.certificate_id: s.current_status.value
        for s in db.query(CertificateStatus).filter(
            CertificateStatus.certificate_id.in_(cert_ids)
        ).all()
    }

    total = db.query(CertificateRecord).filter(
        CertificateRecord.batch_id == batch_id
    ).count()

    return {
        "batch_id":    batch.id,
        "batch_name":  batch.batch_name,
        "academic_year": batch.academic_year,
        "total":       total,
        "results": [
            {
                "certificate_id":  r.id,
                "serial_number":   r.serial_number,
                "fullname":        r.fullname,
                "program":         r.program,
                "graduation_year": r.graduation_year,
                "current_status":  status_map.get(r.id, "ACTIVE"),
            }
            for r in records
        ],
    }