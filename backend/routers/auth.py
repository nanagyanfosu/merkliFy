# backend/routers/auth.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.schemas.auth import LoginRequest, TokenResponse, ChangePasswordRequest
from backend.services.auth_service import authenticate_user, change_password
from backend.utils.security import create_access_token
from backend.dependencies import get_current_user
from backend.models.user import User


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        role=user.role,
        is_temp_password=user.is_temp_password,
    )


@router.post("/change-password")
def change_pwd(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_password(db, current_user, payload.new_password)
    return {"message": "Password updated successfully"}