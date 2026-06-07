"""
One-time admin bootstrap endpoint.

POST /setup/admin creates the first administrator account.
This endpoint becomes permanently unavailable once any admin exists.

It is intentionally unauthenticated — there is no admin yet to authenticate as.
Security is provided by the "zero admins" gate: once an admin exists,
this endpoint does nothing and reveals nothing.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from backend.database import get_db
from backend.models.user import User, UserRole
from backend.utils.security import hash_password

router = APIRouter(prefix="/setup", tags=["setup"])


class AdminSetupRequest(BaseModel):
    email: EmailStr
    password: str
    setup_key: str   


@router.post(
    "/admin",
    summary="Bootstrap the first admin account",
    description=(
        "Creates the initial administrator account. "
        "Only works when NO admin accounts exist. "
        "Requires a SETUP_KEY from the server environment. "
        "Returns 403 immediately if any admin already exists."
    ),
)
def bootstrap_admin(payload: AdminSetupRequest, db: Session = Depends(get_db)):
    from backend.config import settings

    # Gate 1 — has an admin already been created?
    existing_admin = (
        db.query(User).filter(User.role == UserRole.ADMIN).first()
    )
    if existing_admin:
        # Identical response whether admin exists or key is wrong —
        # do not reveal which check failed
        raise HTTPException(
            status_code=403,
            detail="Setup is not available.",
        )

    # Gate 2 — setup key must match the server's configured key
    if payload.setup_key != settings.SETUP_KEY:
        raise HTTPException(
            status_code=403,
            detail="Setup is not available.",
        )

    # Password length check before hashing
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters.",
        )

    admin = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.ADMIN,
        university_id=None,
        is_temp_password=False,   # admin sets their own password during setup
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    return {
        "message": "Administrator account created successfully.",
        "email": admin.email,
        "note": "This endpoint is now permanently disabled.",
    }