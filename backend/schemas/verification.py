# backend/schemas/verification.py
from pydantic import BaseModel, field_validator
from typing import Optional
from enum import Enum


class VerificationRequest(BaseModel):
    """
    All five canonical fields are required for verification.

    These are the exact same five fields that were normalised and hashed
    during certificate issuance. The verifier is effectively reconstructing
    the certificate's cryptographic identity from scratch.

    Normalisation (lowercase + strip) is applied here so the verifier
    does not need to worry about capitalisation matching the stored record.
    """
    serial_number: str
    fullname: str
    program: str
    graduation_year: int
    issuer: str

    @field_validator("serial_number", "fullname", "program", "issuer")
    @classmethod
    def normalise(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("Field cannot be empty")
        return v

    @field_validator("graduation_year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        if not (1900 <= v <= 2100):
            raise ValueError("graduation_year must be between 1900 and 2100")
        return v


class VerificationResult(str, Enum):
    AUTHENTIC        = "AUTHENTIC"
    FAILED           = "FAILED"
    TAMPERED         = "TAMPERED"
    BATCH_TAMPER     = "BATCH_TAMPER_DETECTED"
    UNTRUSTED_ISSUER = "UNTRUSTED_ISSUER"
    REVOKED          = "REVOKED"
    SUSPENDED        = "SUSPENDED"


class VerificationResponse(BaseModel):
    """
    Returned to the verifier.

    Public fields are only populated when the result is not FAILED or TAMPERED.
    This ensures failed lookups reveal nothing about what is or isn't
    in the database.
    """
    result: VerificationResult
    message: str

    # Populated on AUTHENTIC, REVOKED, SUSPENDED
    serial_number: Optional[str] = None
    program: Optional[str] = None
    issuer: Optional[str] = None
    graduation_year: Optional[int] = None

    # Populated on AUTHENTIC only
    merkle_root: Optional[str] = None
    batch_id: Optional[int] = None