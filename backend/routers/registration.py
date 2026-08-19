"""
Public pre-registration for institutions wanting to join MerkliFy.
No authentication required — anyone can submit.
Rate-limited to prevent spam.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.pending_registration import PendingRegistration
from backend.schemas.university import PublicRegistrationRequest

router = APIRouter(prefix="/register", tags=["registration"])


@router.post("/institution")
def submit_registration(
    payload: PublicRegistrationRequest,
    db: Session = Depends(get_db),
):
    """
    Stores a pre-registration request.
    Admin reviews it in the dashboard and converts it with one click.
    """
    # Prevent duplicate submissions from same email
    existing = db.query(PendingRegistration).filter(
        PendingRegistration.official_email == payload.official_email.lower().strip(),
        PendingRegistration.status == "PENDING",
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=(
                "A registration request from this email address is already "
                "pending review. We will be in touch shortly."
            ),
        )

    reg = PendingRegistration(
        university_name=    payload.university_name.strip(),
        institution_type=   payload.institution_type.value,
        location=           payload.location.strip(),
        official_email=     payload.official_email.strip().lower(),
        phone=              payload.phone,
        website_url=        payload.website_url,
        domain=             payload.domain.strip().lower(),
        year_established=   payload.year_established,
        student_population= payload.student_population,
        contact_name=       payload.contact_name.strip(),
        contact_role=       payload.contact_role.strip(),
        notes=              payload.notes,
    )
    db.add(reg)
    db.commit()

    return {
        "message": (
            "Your registration request has been submitted. "
            "Our team will review it and contact you at the "
            "email address you provided."
        )
    }