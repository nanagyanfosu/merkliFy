from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.schemas.auth import LoginRequest, TokenResponse, ChangePasswordRequest,SetupPasswordRequest
from backend.services.auth_service import authenticate_user, change_password, setup_password
from backend.utils.security import create_access_token
from backend.dependencies import get_current_user
from backend.models.user import User, UserRole
from backend.models.university import University


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {
        "access_token":     token,
        "token_type":       "bearer",
        "role":             user.role.value,
        "is_temp_password": user.is_temp_password,
    }


@router.post("/change-password")
def change_pwd(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_password(
        db=db,
        user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return {"message": "Password updated successfully"}


@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the full profile for the authenticated user."""
    university_name = None
    university_code = None
    uni_trust_status = None
    uni_location = None

    if current_user.university_id:
        uni = db.query(University).filter(
            University.id == current_user.university_id
        ).first()
        if uni:
            university_name  = uni.university_name
            university_code  = uni.university_code
            uni_trust_status = uni.trust_status
            uni_location     = uni.location

    return {
        "id":               current_user.id,
        "email":            current_user.email,
        "role":             current_user.role.value,
        "issuer_name":      current_user.issuer_name,
        "department":       current_user.department,
        "department_code":  current_user.department_code,
        "university_id":    current_user.university_id,
        "university_name":  university_name,
        "university_code":  university_code,
        "university_trust": uni_trust_status,
        "university_location": uni_location,
        "is_temp_password": current_user.is_temp_password,
        "created_at":       current_user.created_at.isoformat(),
    }

@router.post("/setup-password")
def setup_pwd(
    payload: SetupPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    setup_password(db, current_user, payload.new_password)
    return {
        "message": "Password set successfully. Welcome to merkliFy.",
        "role": current_user.role.value,
    }

@router.post("/change-password")
def change_pwd(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Regular password change from Settings. Requires current password.
    Only works when is_temp_password is False.
    """
    if current_user.is_temp_password:
        raise HTTPException(
            status_code=400,
            detail=(
                "Your account requires a first-time password setup. "
                "Use /auth/setup-password instead."
            ),
        )
    change_password(db, current_user, payload.current_password, payload.new_password)
    return {"message": "Password updated successfully."}


@router.post("/verify-password")
def verify_pwd(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Verifies the current password without changing anything.
    Used by the two-step change password form in Settings.
    Returns 200 if correct, 400 if wrong.
    """
    from backend.utils.security import verify_password as _verify
    password = payload.get("password", "")
    if not _verify(password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Password is incorrect.")
    return {"verified": True}