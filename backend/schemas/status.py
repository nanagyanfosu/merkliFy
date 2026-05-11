# backend/schemas/status.py
from pydantic import BaseModel
from typing import Optional
from backend.models.status import CertificateLifecycleStatus


class StatusChangeRequest(BaseModel):
    """
    Sent by an issuer or admin to change a certificate's lifecycle status.

    new_status must be a valid CertificateLifecycleStatus value.
    reason is optional but strongly recommended for audit trail quality —
    the frontend should encourage (but not force) issuers to provide one.
    """
    new_status: CertificateLifecycleStatus
    reason: Optional[str] = None


class StatusChangeResponse(BaseModel):
    """
    Returned after a successful status change.
    """
    certificate_id: int
    serial_number: str
    fullname: str
    old_status: CertificateLifecycleStatus
    new_status: CertificateLifecycleStatus
    changed_by_email: str
    reason: Optional[str]
    message: str


class StatusHistoryEntry(BaseModel):
    """One entry in the audit trail for a certificate."""
    id: int
    old_status: str
    new_status: str
    changed_by_email: str
    reason: Optional[str]
    changed_at: str

    model_config = {"from_attributes": True}


class CertificateStatusResponse(BaseModel):
    """
    Full status view for a certificate — used on the issuer dashboard
    when an issuer searches for a specific certificate to manage.
    """
    certificate_id: int
    serial_number: str
    fullname: str
    program: str
    graduation_year: int
    issuer: str
    current_status: CertificateLifecycleStatus
    batch_id: int
    batch_name: str
    history: list[StatusHistoryEntry]


class CertificateSearchRequest(BaseModel):
    """
    Search parameters for certificate lookup on the dashboard.
    At least one field must be provided.
    """
    serial_number: Optional[str] = None
    fullname: Optional[str] = None
    program: Optional[str] = None
    graduation_year: Optional[int] = None