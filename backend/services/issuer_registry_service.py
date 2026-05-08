# backend/services/issuer_registry_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.models.university import University, TrustStatus
from backend.schemas.university import RegisterUniversityResponse, CreateUniversityRequest
from backend.services.signature_service import generate_rsa_key_pair
from backend.models.user import User


def register_university(
    db: Session,
    payload: CreateUniversityRequest,
    admin: User,
) -> RegisterUniversityResponse:
    """
    Registers a university and generates its RSA key pair.

    Both keys are stored in the database:
      - public_key:            plaintext PEM  (safe — designed to be public)
      - encrypted_private_key: Fernet-encrypted PEM (never returned via API)

    The response contains only the university ID, public key, and status.
    No private key material appears anywhere in the return value.
    """
    existing = db.query(University).filter(
        University.official_email == payload.official_email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="University already registered")

    # generate_rsa_key_pair() returns (encrypted_private_pem, public_pem)
    # The raw private key PEM exists only transiently inside that function.
    encrypted_private_key, public_key_pem = generate_rsa_key_pair()

    university = University(
        university_name=payload.university_name,
        official_email=payload.official_email,
        domain=payload.domain,
        public_key=public_key_pem,
        encrypted_private_key=encrypted_private_key,   # stored encrypted, never returned
        trust_status=TrustStatus.TRUSTED,
    )
    db.add(university)
    db.commit()
    db.refresh(university)

    return RegisterUniversityResponse(
        id=university.id,
        university_name=university.university_name,
        public_key=university.public_key,
        trust_status=university.trust_status,
        message=(
            "University registered successfully. "
            "RSA key pair has been generated and stored securely. "
            "The private key is encrypted at rest and is not accessible externally."
        ),
    )


def list_universities(db: Session) -> list[dict]:
    """
    Returns safe public-facing university fields only.
    encrypted_private_key is deliberately excluded from this output.
    """
    universities = db.query(University).all()
    return [
        {
            "id": u.id,
            "university_name": u.university_name,
            "official_email": u.official_email,
            "domain": u.domain,
            "public_key": u.public_key,
            "trust_status": u.trust_status,
            "created_at": u.created_at,
        }
        for u in universities
    ]


def update_trust_status(db: Session, university_id: int, new_status: str) -> dict:
    university = db.query(University).filter(University.id == university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="University not found")

    try:
        university.trust_status = TrustStatus(new_status)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status}'. Must be one of: PENDING, TRUSTED, REVOKED",
        )

    db.commit()
    return {
        "university_id": university_id,
        "new_status": university.trust_status,
        "message": f"Trust status updated to {new_status}",
    }


def get_university_for_signing(db: Session, university_id: int) -> University:
    """
    Internal-only function used by the upload/signing pipeline.
    Returns the full ORM object including encrypted_private_key.

    MUST NOT be called from any router directly.
    MUST only be called from services that perform signing operations.
    """
    university = db.query(University).filter(
        University.id == university_id,
        University.trust_status == TrustStatus.TRUSTED,
    ).first()

    if not university:
        raise HTTPException(
            status_code=403,
            detail="University not found or not trusted. Cannot issue certificates.",
        )

    if not university.encrypted_private_key:
        raise HTTPException(
            status_code=500,
            detail=f"University ID {university_id} has no signing key. Contact admin.",
        )

    return university