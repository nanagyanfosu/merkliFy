# backend/schemas/status.py
from pydantic import BaseModel, field_validator
from typing import Optional
from enum import Enum
from backend.models.status import CertificateLifecycleStatus


class CertificateSearchRequest(BaseModel):

    serial_number:   Optional[str] = None
    fullname:        Optional[str] = None
    program:         Optional[str] = None
    graduation_year: Optional[int] = None
    status:          Optional[str] = None       # ACTIVE / REVOKED / SUSPENDED
    academic_year:   Optional[int] = None
    exact_match:     bool          = False
    sort_by:         str           = "serial_number"
    sort_dir:        str           = "asc"

    @field_validator("sort_by")
    @classmethod
    def validate_sort_by(cls, v):
        allowed = {"serial_number", "fullname", "program",
                   "graduation_year", "created_at"}
        if v not in allowed:
            return "serial_number"
        return v

    @field_validator("sort_dir")
    @classmethod
    def validate_sort_dir(cls, v):
        return "desc" if v.lower() == "desc" else "asc"


class StatusChangeRequest(BaseModel):
    new_status: CertificateLifecycleStatus
    reason:     Optional[str] = None


class StatusChangeResponse(BaseModel):
    certificate_id:    int
    serial_number:     str
    fullname:          str
    old_status:        CertificateLifecycleStatus
    new_status:        CertificateLifecycleStatus
    changed_by_email:  str
    reason:            Optional[str]
    message:           str


class StatusHistoryEntry(BaseModel):
    id:               int
    old_status:       str
    new_status:       str
    changed_by_email: str
    reason:           Optional[str]
    changed_at:       str
    model_config = {"from_attributes": True}


class CertificateStatusResponse(BaseModel):
    certificate_id:  int
    serial_number:   str
    fullname:        str
    program:         str
    graduation_year: int
    issuer:          str
    current_status:  CertificateLifecycleStatus
    batch_id:        int
    batch_name:      str
    history:         list[StatusHistoryEntry]