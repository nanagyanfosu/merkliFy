import secrets
import string
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.models.user import User, UserRole
from backend.utils.security import hash_password, verify_password


def authenticate_user(db: Session, email: str, password: str) -> User:
    normalised = email.strip().lower()
    user = db.query(User).filter(User.email == normalised).first()

    # Identical response for missing user and wrong password.
    # Never reveal which condition failed.
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Stamp last login only after successful authentication
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    return user


def generate_secure_temp_password(length: int = 14) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        pw = "".join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.isupper() for c in pw) and
                any(c.isdigit() for c in pw) and
                any(c in "!@#$%^&*" for c in pw)):
            return pw


def create_issuer_account(
    db: Session,
    email: str,
    university_id: int,
    created_by: User,
    issuer_name: str = "",
    department: str = "",
) -> tuple[User, str]:
    if created_by.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")

    normalised_email = email.strip().lower()
    if db.query(User).filter(User.email == normalised_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if not issuer_name or len(issuer_name.strip()) < 2:
        raise HTTPException(
            status_code=400,
            detail="Issuer name is required and must be at least 2 characters."
        )

    password = generate_secure_temp_password()
    user = User(
        email=normalised_email,
        password_hash=hash_password(password),
        role=UserRole.ISSUER,
        university_id=university_id,
        issuer_name=issuer_name.strip(),
        department=department.strip() or None,
        is_temp_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, password


def change_password(
    db: Session, user: User,
    current_password: str, new_password: str,
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if current_password == new_password:
        raise HTTPException(status_code=400, detail="New password must differ from current.")
    user.password_hash = hash_password(new_password)
    user.is_temp_password = False
    db.commit()


def setup_password(db: Session, user: User, new_password: str) -> None:
    if not user.is_temp_password:
        raise HTTPException(
            status_code=403,
            detail="Only available for first-time password setup.",
        )
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    user.password_hash = hash_password(new_password)
    user.is_temp_password = False
    db.commit()


def reset_issuer_password(db: Session, user_id: int, admin: User) -> tuple[User, str]:
    issuer = db.query(User).filter(
        User.id == user_id, User.role == UserRole.ISSUER
    ).first()
    if not issuer:
        raise HTTPException(status_code=404, detail="Issuer not found")
    new_password = generate_secure_temp_password()
    issuer.password_hash = hash_password(new_password)
    issuer.is_temp_password = True
    db.commit()
    return issuer, new_password