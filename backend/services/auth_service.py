# backend/services/auth_service.py
from sqlalchemy.orm import Session
from backend.models.user import User, UserRole
from backend.utils.security import hash_password, verify_password, create_access_token
from fastapi import HTTPException, status


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return user


def create_issuer_account(
    db: Session,
    email: str,
    temp_password: str,
    university_id: int,
    created_by: User,
) -> User:
    if created_by.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=email,
        password_hash=hash_password(temp_password),
        role=UserRole.ISSUER,
        university_id=university_id,
        is_temp_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    user.is_temp_password = False
    db.commit()