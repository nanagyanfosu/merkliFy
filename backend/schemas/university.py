from pydantic import BaseModel
from backend.models.university import TrustStatus
from datetime import datetime
from typing import Optional


class CreateUniversityRequest(BaseModel):
    university_name: str
    location:        str
    contact:         str
    domain:          str


class UniversityResponse(BaseModel):
    id:               int
    university_code:  int
    university_name:  str
    location:         str
    contact:          str
    domain:           str
    trust_status:     TrustStatus
    public_key:       Optional[str] = None
    created_at:       datetime

    model_config = {"from_attributes": True}


class RegisterUniversityResponse(BaseModel):
    id:               int
    university_code:  int
    university_name:  str
    location:         str
    trust_status:     TrustStatus
    message:          str


class TrustStatusUpdateResponse(BaseModel):
    university_id: int
    new_status:    TrustStatus
    message:       str