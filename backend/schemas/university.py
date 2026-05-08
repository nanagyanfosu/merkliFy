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
    created_at: datetime

    model_config = {"from_attributes": True}


class ApproveUniversityResponse(BaseModel):
    university: UniversityResponse
    # RSA private key returned ONCE to the admin to hand to the university.
    # Never stored on the server.
    private_key_pem: str
    message: str