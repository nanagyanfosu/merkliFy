from pydantic import BaseModel, field_validator
from typing import Optional
from enum import Enum


class VerificationRequest(BaseModel):
    serial_number:   str
    fullname:        str
    program:         str
    graduation_year: int
    issuer:          str

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
    """
    NOT_VERIFIED covers all cases where the certificate cannot be confirmed:
      - Serial number does not exist
      - Serial exists but fields don't match (user error)
      - Serial exists but stored data has been tampered (security event)
    The distinction is recorded internally in verification_logs but never
    exposed to the caller.

    CANNOT_VERIFY covers batch-level integrity failures and untrusted issuer:
      - Merkle Root reconstruction fails
      - RSA signature invalid
    Again, the specific reason is logged internally only.
    """
    AUTHENTIC      = "AUTHENTIC"
    NOT_VERIFIED   = "NOT_VERIFIED"    
    REVOKED        = "REVOKED"
    SUSPENDED      = "SUSPENDED"
    CANNOT_VERIFY  = "CANNOT_VERIFY"   


class InternalVerificationCode(str, Enum):
    """
    Detailed codes stored in verification_logs for admin visibility.
    Never returned in the API response.
    """
    AUTHENTIC               = "AUTHENTIC"
    NOT_FOUND               = "NOT_FOUND"           # serial doesn't exist at all
    INPUT_MISMATCH          = "INPUT_MISMATCH"       # serial found, hash wrong, data intact
    DATA_TAMPERED           = "DATA_TAMPERED"        # serial found, stored data corrupted
    BATCH_TAMPER_DETECTED   = "BATCH_TAMPER_DETECTED"
    UNTRUSTED_ISSUER        = "UNTRUSTED_ISSUER"
    REVOKED                 = "REVOKED"
    SUSPENDED               = "SUSPENDED"


class VerificationResponse(BaseModel):
    result:          VerificationResult
    message:         str
    serial_number:   Optional[str] = None
    program:         Optional[str] = None
    issuer:          Optional[str] = None
    graduation_year: Optional[int] = None