import sys
import os

# Ensure project root is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.database import SessionLocal, engine
from backend.database import Base
from backend.models.user import User, UserRole
from backend.utils.security import hash_password


def main():
    print("=" * 50)
    print("  merkliFy — Admin Account Setup")
    print("=" * 50)

    # Create all tables if they don't exist yet
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if existing:
            print(f"\n✓ Admin already exists: {existing.email}")
            print("  Nothing to do.")
            return

        print("\nNo admin account found. Creating one now.\n")

        email = input("Admin email: ").strip()
        if not email or "@" not in email:
            print("Invalid email address.")
            sys.exit(1)

        import getpass
        password = getpass.getpass("Admin password (min 8 chars): ")
        confirm  = getpass.getpass("Confirm password: ")

        if password != confirm:
            print("Passwords do not match.")
            sys.exit(1)

        if len(password) < 8:
            print("Password must be at least 8 characters.")
            sys.exit(1)

        admin = User(
            email=email,
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            university_id=None,
            is_temp_password=False,
        )
        db.add(admin)
        db.commit()

        print(f"\n✅ Admin account created: {email}")
        print("   You can now log in at /admin/login")

    finally:
        db.close()


if __name__ == "__main__":
    main()