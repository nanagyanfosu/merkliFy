"""
Institution contact / access request endpoint.
Sends an email via SMTP (Zoho Mail) when an institution fills
the request form on the landing page.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from backend.config import settings

router = APIRouter(prefix="/contact", tags=["contact"])


class InstitutionRequest(BaseModel):
    institution_name: str
    contact_name:     str
    email:            EmailStr
    notes:            str = ""


@router.post("/request-access")
def request_access(payload: InstitutionRequest):
    """
    Sends a formatted email to the MerkliFy admin inbox
    when an institution submits the landing page form.
    """
    try:
        _send_email(
            to=settings.ADMIN_EMAIL,
            subject=f"MerkliFy Access Request — {payload.institution_name}",
            body=f"""
New institution access request received via MerkliFy.

Institution: {payload.institution_name}
Contact:     {payload.contact_name}
Email:       {payload.email}

Notes:
{payload.notes or "(none provided)"}

---
Respond to the contact email above to begin onboarding.
            """.strip(),
        )

        # Auto-reply to the institution
        _send_email(
            to=payload.email,
            subject="We received your MerkliFy access request",
            body=f"""
Dear {payload.contact_name},

Thank you for your interest in MerkliFy. We have received your access
request for {payload.institution_name} and will be in touch shortly to
discuss the next steps.

In the meantime, if you have any questions please reply to this email
or contact us at {settings.ADMIN_EMAIL}.

Regards,
The MerkliFy Team
            """.strip(),
        )

    except Exception as e:
        # Don't expose SMTP errors to the client
        raise HTTPException(
            status_code=500,
            detail="Unable to send your request at this time. "
                   f"Please email us directly at {settings.ADMIN_EMAIL}",
        )

    return {
        "message": (
            "Your request has been received. We will be in touch "
            "with you at the email address you provided."
        )
    }


def _send_email(to: str, subject: str, body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = settings.SMTP_FROM
    msg["To"]      = to
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, to, msg.as_string())