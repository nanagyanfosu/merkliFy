from pydantic import BaseModel, EmailStr
from backend.models.university import TrustStatus, InstitutionType
from datetime import datetime
from typing import Optional


class CreateUniversityRequest(BaseModel):
    university_name: str
    location:        str
    contact:         str
    domain:          str

class UpdateUniversityRequest(BaseModel):
    """
    All fields optional — only provided fields are updated.
    university_code, public_key, encrypted_private_key, and
    trust_status are excluded as they have dedicated
    endpoints.
    """
    university_name:    Optional[str]             = None
    institution_type:   Optional[InstitutionType] = None
    location:           Optional[str]             = None
    official_email:     Optional[str]             = None
    phone:              Optional[str]             = None
    website_url:        Optional[str]             = None
    domain:             Optional[str]             = None
    year_established:   Optional[int]             = None
    student_population: Optional[int]             = None

    model_config = {"populate_by_name": True}

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


class PublicRegistrationRequest(BaseModel):
    university_name:    str
    institution_type:   InstitutionType
    location:           str
    official_email:     EmailStr
    phone:              Optional[str] = None
    website_url:        Optional[str] = None
    domain:             str
    year_established:   Optional[int] = None
    student_population: Optional[int] = None
    contact_name:       str
    contact_role:       str
    notes:              Optional[str] = None

    class Config:
        use_enum_values = False