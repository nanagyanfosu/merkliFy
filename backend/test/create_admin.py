import argparse
from getpass import getpass

# import _bootstrap  # noqa: F401

from backend.database import SessionLocal
from backend.database import Base, engine
from backend.models.user import User, UserRole
from backend.utils.security import hash_password


def create_admin(email: str, password: str) -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user is not None:
            raise ValueError(f"A user with email {email!r} already exists.")

        admin_user = User(
            email=email,
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            university_id=None,
            is_temp_password=False,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("Admin user created successfully")
        print("ID:", admin_user.id)
        print("Email:", admin_user.email)
        print("Role:", admin_user.role)
        print("Temp password:", admin_user.is_temp_password)
    except Exception as exc:
        db.rollback()
        print("Error:", exc)
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the first admin account")
    parser.add_argument("--email", help="Admin email address")
    parser.add_argument("--password", help="Admin password")
    args = parser.parse_args()

    email = args.email or input("Admin email: ").strip()
    password = args.password or getpass("Admin password: ")

    if not email or not password:
        raise SystemExit("Email and password are required.")

    create_admin(email, password)


if __name__ == "__main__":
    main()