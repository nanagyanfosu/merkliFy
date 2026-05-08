# backend/routers/admin.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_admin
from backend.models.user import User
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