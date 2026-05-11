# backend/schemas/certificate.py
from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
import re


class CertificateRowInput(BaseModel):
    """
    Represents one certificate row from an uploaded CSV or JSON file.

    Required fields are the five canonical fields that get hashed.
    Optional fields are stored for reference but excluded from the hash.

    All string fields are stripped and lowercased during validation so
    the canonical hash produced here matches any future reconstruction
    exactly — regardless of the capitalisation in the source file.
    """
    serial_number: str
    fullname: str
    program: str
    graduation_year: int
    issuer: str

    # Optional metadata — stored but NOT hashed
    student_id: Optional[str] = None
    classification: Optional[str] = None
    issue_date: Optional[str] = None

    @field_validator("serial_number")
    @classmethod
    def validate_serial_number(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("serial_number cannot be empty")
        # Reject pipe characters — they are the canonical separator
        if "|" in v:
            raise ValueError("serial_number must not contain the '|' character")
        return v

    @field_validator("fullname", "program", "issuer")
    @classmethod
    def validate_non_empty_string(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty or whitespace")
        if "|" in v:
            raise ValueError("Field must not contain the '|' character")
        return v

    @field_validator("graduation_year")
    @classmethod
    def validate_graduation_year(cls, v: int) -> int:
        if not (1900 <= v <= 2100):
            raise ValueError(f"graduation_year {v} is outside the valid range 1900–2100")
        return v

    @field_validator("issue_date", mode="before")
    @classmethod
    def validate_issue_date(cls, v) -> Optional[str]:
        if v is None or v == "":
            return None
        v = str(v).strip()
        # Accept YYYY-MM-DD format only
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("issue_date must be in YYYY-MM-DD format")
        return v


class BatchUploadResponse(BaseModel):
    """Returned to the issuer after a successful batch upload."""
    batch_id: int
    batch_name: str
    merkle_root: str
    total_certificates: int
    message: str


class BatchSummaryResponse(BaseModel):
    """Lightweight batch listing for issuer dashboard."""
    batch_id: int
    batch_name: str
    merkle_root: str
    total_certificates: int
    created_at: str

    model_config = {"from_attributes": True}