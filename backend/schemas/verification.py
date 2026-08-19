from pydantic import BaseModel, field_validator
from typing import Optional
from enum import Enum


class VerificationRequest(BaseModel):
    """
    Reduced to three visible fields.
    Program and graduation_year are retrieved from the stored record
    after the three-field match succeeds and used internally
    for hash reconstruction and display. They are never required
    from the verifier.
    """
    serial_number: str
    fullname:      str
    issuer:        str

    @field_validator("serial_number", "fullname", "issuer")
    @classmethod
    def normalise(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class VerificationResult(str, Enum):
    AUTHENTIC      = "AUTHENTIC"
    NOT_VERIFIED   = "NOT_VERIFIED"
    REVOKED        = "REVOKED"
    SUSPENDED      = "SUSPENDED"
    CANNOT_VERIFY  = "CANNOT_VERIFY"


class InternalVerificationCode(str, Enum):
    AUTHENTIC             = "AUTHENTIC"
    NOT_FOUND             = "NOT_FOUND"
    NAME_MISMATCH         = "NAME_MISMATCH"
    INSTITUTION_MISMATCH  = "INSTITUTION_MISMATCH"
    INPUT_MISMATCH        = "INPUT_MISMATCH"
    DATA_TAMPERED         = "DATA_TAMPERED"
    BATCH_TAMPER_DETECTED = "BATCH_TAMPER_DETECTED"
    UNTRUSTED_ISSUER      = "UNTRUSTED_ISSUER"
    REVOKED               = "REVOKED"
    SUSPENDED             = "SUSPENDED"


class VerificationResponse(BaseModel):
    result:          VerificationResult
    message:         str
    serial_number:   Optional[str] = None
    program:         Optional[str] = None
    issuer:          Optional[str] = None
    graduation_year: Optional[int] = None
    fullname:        Optional[str] = None