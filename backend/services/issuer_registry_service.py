import random
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.models.university import University, TrustStatus
from backend.models.user import User
from backend.schemas.university import (
    RegisterUniversityResponse,
    CreateUniversityRequest,
)
from backend.services.signature_service import generate_rsa_key_pair


def _unique_university_code(db: Session) -> int:
    for _ in range(20):   # max 20 attempts
        code = random.randint(10000, 99999)
        if not db.query(University).filter(University.university_code == code).first():
            return code
    raise HTTPException(status_code=500, detail="Could not generate a unique university code.")


def register_university(
    db: Session,
    payload: CreateUniversityRequest,
    admin: User,
) -> RegisterUniversityResponse:
    # Prevent exact duplicate names
    existing = db.query(University).filter(
        University.university_name == payload.university_name.strip()
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A university named '{payload.university_name}' is already registered.",
        )

    encrypted_private_key, public_key_pem = generate_rsa_key_pair()

    university = University(
        university_code=_unique_university_code(db),
        university_name=payload.university_name.strip(),
        location=payload.location.strip(),
        contact=payload.contact.strip(),
        domain=payload.domain.strip().lower(),
        public_key=public_key_pem,
        encrypted_private_key=encrypted_private_key,
        trust_status=TrustStatus.PENDING,   # admin approves separately
    )
    db.add(university)
    db.commit()
    db.refresh(university)

    return RegisterUniversityResponse(
        id=university.id,
        university_code=university.university_code,
        university_name=university.university_name,
        location=university.location,
        trust_status=university.trust_status,
        message="University registered. Approve it to enable certificate issuance.",
    )


def list_universities_with_issuers(db: Session) -> list[dict]:
    """
    Returns universities with their associated issuer accounts.
    Used by the admin dashboard university tab.
    """
    universities = db.query(University).order_by(University.university_name).all()
    result = []
    for u in universities:
        issuers = [
            {"id": usr.id, "email": usr.email, "is_temp_password": usr.is_temp_password}
            for usr in u.users
        ]
        result.append({
            "id":               u.id,
            "university_code":  u.university_code,
            "university_name":  u.university_name,
            "location":         u.location,
            "contact":          u.contact,
            "domain":           u.domain,
            "trust_status":     u.trust_status,
            "issuers":          issuers,
            "created_at":       u.created_at.isoformat(),
        })
    return result


def update_trust_status(db: Session, university_id: int, new_status: str) -> dict:
    university = db.query(University).filter(University.id == university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="University not found")

    try:
        university.trust_status = TrustStatus(new_status)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status}'. Must be: PENDING, TRUSTED, or REVOKED",
        )

    db.commit()
    return {"university_id": university_id, "new_status": university.trust_status}


def get_university_for_signing(db: Session, university_id: int) -> University:
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