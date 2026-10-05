from typing import Optional

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):  
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token:     str
    token_type:       str = "bearer"
    role:             str
    is_temp_password: bool
    model_config = {"use_enum_values": True}


class ChangePasswordRequest(BaseModel):
    """Used by the Settings security tab. Always requires current password."""
    current_password: str
    new_password:     str


class SetupPasswordRequest(BaseModel):
    """
    Used only on first login when is_temp_password is True.
    Does not require current_password — the user just proved they
    know the temp password by authenticating successfully.
    """
    new_password: str

class UpdateIssuerRequest(BaseModel):
    """
    Editable fields for an issuer account.
    Email changes are validated for uniqueness server-side.
    """
    issuer_name:   Optional[str] = None
    department:    Optional[str] = None
    email:         Optional[str] = None
    university_id: Optional[int] = None