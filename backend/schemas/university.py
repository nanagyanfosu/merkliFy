# backend/schemas/university.py
from pydantic import BaseModel, EmailStr
from backend.models.university import TrustStatus
from datetime import datetime


class CreateUniversityRequest(BaseModel):
    university_name: str
    official_email: EmailStr
    domain: str


class UniversityResponse(BaseModel):
    id: int
    university_name: str
    official_email: str
    domain: str
    trust_status: TrustStatus
    # public_key is safe to expose — it is designed to be public
    public_key: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RegisterUniversityResponse(BaseModel):
    """
    Returned after university registration.

    Contains NO private key material.
    The encrypted_private_key column exists in the DB but is never
    included in any Pydantic schema — it has no path to any API response.
    """
    id: int
    university_name: str
    public_key: str
    trust_status: TrustStatus
    message: str

    model_config = {"from_attributes": True}


class TrustStatusUpdateResponse(BaseModel):
    university_id: int
    new_status: TrustStatus
    message: str