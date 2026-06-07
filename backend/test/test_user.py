import _bootstrap  # noqa: F401

from backend.database import SessionLocal
from backend.models.user import User
from backend.utils.security import get_password_hash

db = SessionLocal()

try:
    print("Creating test user...")

    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        role="admin"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    print("User created:")
    print("ID:", user.id)
    print("Email:", user.email)

except Exception as e:
    db.rollback()
    print("Error:", e)

finally:
    db.close()