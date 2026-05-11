# backend/routers/admin.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_admin
from backend.models.user import User
from backend.models.verification_log import VerificationLog
from backend.models.certificate import CertificateRecord
from backend.schemas.university import (
    CreateUniversityRequest,
    RegisterUniversityResponse,
    TrustStatusUpdateResponse,
)
from backend.services import issuer_registry_service


router = APIRouter(prefix="/admin", tags=["admin"])


@router.post(
    "/universities",
    response_model=RegisterUniversityResponse,
    summary="Register and approve a university",
    description=(
        "Creates a university record and generates its RSA key pair. "
        "The private key is encrypted at rest and is never exposed through this or any endpoint. "
        "Only the university ID, public key, and status are returned."
    ),
)
def register_university(
    payload: CreateUniversityRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return issuer_registry_service.register_university(db, payload, admin)


@router.get(
    "/universities",
    summary="List all registered universities",
)
def list_universities(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    # list_universities() returns dicts with encrypted_private_key excluded
    return issuer_registry_service.list_universities(db)


@router.patch(
    "/universities/{university_id}/trust",
    summary="Update a university's trust status",
)
def set_trust_status(
    university_id: int,
    status: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return issuer_registry_service.update_trust_status(db, university_id, status)


@router.post(
    "/issuers",
    summary="Create an issuer account for a registered university",
)
def create_issuer(
    email: str,
    temp_password: str,
    university_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from backend.services.auth_service import create_issuer_account
    user = create_issuer_account(db, email, temp_password, university_id, admin)
    return {
        "id": user.id,
        "email": user.email,
        "university_id": user.university_id,
        "message": "Issuer account created. User must change password on first login.",
    }

@router.get(
    "/verification-logs",
    summary="Query verification audit logs",
    description="Returns recent verification attempts. Filterable by result and serial number.",
)
def get_verification_logs(
    result_filter: str | None = None,
    serial_number: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = db.query(VerificationLog)

    if result_filter:
        query = query.filter(VerificationLog.verification_result == result_filter.upper())

    if serial_number:
        query = query.filter(
            VerificationLog.serial_number == serial_number.strip().lower()
        )

    total = query.count()
    logs = (
        query.order_by(VerificationLog.timestamp.desc())
        .offset(offset)
        .limit(min(limit, 500))  # hard cap to prevent memory abuse
        .all()
    )

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "logs": [
            {
                "id": log.id,
                "serial_number": log.serial_number,
                "fullname": log.fullname,
                "result": log.verification_result,
                "ip_address": log.ip_address,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in logs
        ],
    }