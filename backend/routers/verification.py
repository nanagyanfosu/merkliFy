# backend/routers/verification.py
"""
Public verification endpoint.

No authentication required — this endpoint is intentionally public.
Anyone with a serial_number and name can verify a certificate.

Rate limiting should be applied at the infrastructure level (nginx,
Cloudflare, or a FastAPI middleware) in production to prevent
automated bulk probing of the certificate database.
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.verification import VerificationRequest, VerificationResponse
from backend.services.verification_service import verify_certificate

router = APIRouter(prefix="/verify", tags=["verification"])


@router.post(
    "",
    response_model=VerificationResponse,
    summary="Verify a certificate",
    description=(
        "Public endpoint. No login required. "
        "Provide the certificate serial number and the graduate's full name. "
        "Program and graduation year are optional additional checks. "
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
    """
    Extracts the real client IP address from the request.

    Checks X-Forwarded-For first (set by reverse proxies like nginx/Cloudflare).
    Falls back to the direct connection IP if the header is absent.

    Only the first IP in X-Forwarded-For is used — subsequent entries
    may be added by intermediate proxies and are less trustworthy.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None