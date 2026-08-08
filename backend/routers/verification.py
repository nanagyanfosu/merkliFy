from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.verification import VerificationRequest, VerificationResponse
from backend.services.verification_service import verify_certificate
from slowapi import Limiter
from slowapi.util import get_remote_address


router = APIRouter(prefix="/verify", tags=["verification"])

limiter = Limiter(key_func=get_remote_address)
@router.post("")
@limiter.limit("10/minute")
def verify(request: Request, payload: VerificationRequest,
           db: Session = Depends(get_db)):
    ip_address = _get_client_ip(request)
    return verify_certificate(db, payload, ip_address)

@router.get("/institutions")
def list_trusted_institutions(db: Session = Depends(get_db)):
    """Public — returns trusted university names for the verification dropdown."""
    from backend.models.university import University, TrustStatus

    unis = (
        db.query(University)
        .filter(University.trust_status == TrustStatus.TRUSTED)
        .order_by(University.university_name)
        .all()
    )
    return [{"id": u.id, "university_name": u.university_name} for u in unis]


@router.post(
    "",
    response_model=VerificationResponse,
    summary="Verify a certificate",
    description=(
        "Public endpoint. No login required. "
        "Provide the certificate serial number, program, graduation year, university name and the graduate's full name. "
        "Every verification attempt is logged with its result and IP address."
    ),
)
def verify(
    payload: VerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    # Extract real client IP — handles reverse proxy forwarding headers
    ip_address = _get_client_ip(request)
    return verify_certificate(db, payload, ip_address)


def _get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None
