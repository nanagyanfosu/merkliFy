# backend/services/issuer_registry_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.models.university import University, TrustStatus
from backend.schemas.university import (
    CreateUniversityRequest,
    ApproveUniversityResponse,
    UniversityResponse,
)
from backend.services.signature_service import generate_rsa_key_pair
from backend.models.user import User


def register_university(
    db: Session,
    payload: CreateUniversityRequest,
    admin: User,
) -> ApproveUniversityResponse:
    # Prevent duplicate registrations
    existing = db.query(University).filter(
        University.official_email == payload.official_email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="University already registered")

    # Generate RSA key pair for this university
    private_key_pem, public_key_pem = generate_rsa_key_pair()

    university = University(
        university_name=payload.university_name,
        official_email=payload.official_email,
        domain=payload.domain,
        public_key=public_key_pem,         # stored permanently
        trust_status=TrustStatus.TRUSTED,   # admin approval = immediate trust
    )
    db.add(university)
    db.commit()
    db.refresh(university)

    return ApproveUniversityResponse(
        university=UniversityResponse.model_validate(university),
        private_key_pem=private_key_pem,    # returned ONCE, never stored
        message=(
            "University registered. Provide the private key to the issuer securely. "
            "It will NOT be retrievable again."
        ),
    )


def list_universities(db: Session) -> list[University]:
    return db.query(University).all()


def update_trust_status(db: Session, university_id: int, new_status: str) -> dict:
    university = db.query(University).filter(University.id == university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="University not found")

    try:
        university.trust_status = TrustStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")

    db.commit()
    return {"message": f"Trust status updated to {new_status}"}