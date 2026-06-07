import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.database import SessionLocal
from backend.models.user import User, UserRole
from backend.utils.security import hash_password
import getpass

db = SessionLocal()
try:
    email    = input("Admin email to reset: ").strip().lower()
    password = getpass.getpass("New password: ")
    confirm  = getpass.getpass("Confirm: ")

    if password != confirm:
        print("Passwords do not match.")
        sys.exit(1)

    user = db.query(User).filter(
        User.email == email,
        User.role == UserRole.ADMIN,
    ).first()

    if not user:
        print(f"No admin found with email '{email}'.")
        sys.exit(1)

    user.password_hash = hash_password(password)
    user.is_temp_password = False
    db.commit()
    print(f"✅ Password updated for {email}")
finally:
    db.close()