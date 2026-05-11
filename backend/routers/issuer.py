# backend/routers/issuer.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_issuer
from backend.models.user import User
from backend.schemas.certificate import BatchUploadResponse
from backend.schemas.status import (
    StatusChangeRequest,
    StatusChangeResponse,
    CertificateStatusResponse,
    CertificateSearchRequest,
)
from backend.services import upload_service, batch_service, status_service

router = APIRouter(prefix="/issuer", tags=["issuer"])


# ============================================================
# BATCH UPLOAD (Phase 3 — unchanged)
# ============================================================

@router.post(
    "/batches/upload",
    response_model=BatchUploadResponse,
    summary="Upload a certificate batch (CSV or JSON)",
)
async def upload_batch(
    file: UploadFile = File(...),
    batch_name: str = Form(...),
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
        validated_rows=validated_rows,
    )


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


# ============================================================
# CERTIFICATE SEARCH — Dashboard lookup before status action
# ============================================================

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


# ============================================================
# CERTIFICATE STATUS MANAGEMENT
# ============================================================

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