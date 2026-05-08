# backend/routers/admin.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import require_admin
from backend.models.user import User
from backend.schemas.university import CreateUniversityRequest, ApproveUniversityResponse
from backend.services import issuer_registry_service


router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/universities", response_model=ApproveUniversityResponse)
def register_and_approve_university(
    payload: CreateUniversityRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Creates a university entry, generates its RSA key pair,
    stores the public key, returns the private key once.
    """
    return issuer_registry_service.register_university(db, payload, admin)


@router.get("/universities")
def list_universities(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return issuer_registry_service.list_universities(db)


@router.post("/universities/{university_id}/trust")
def set_trust_status(
    university_id: int,
    status: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return issuer_registry_service.update_trust_status(db, university_id, status)


@router.post("/issuers")
def create_issuer(
    email: str,
    temp_password: str,
    university_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from backend.services.auth_service import create_issuer_account
    user = create_issuer_account(db, email, temp_password, university_id, admin)
    return {"id": user.id, "email": user.email, "message": "Issuer account created"}