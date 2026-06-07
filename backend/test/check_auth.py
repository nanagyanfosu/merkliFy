from pathlib import Path
import sys

# ensure project root is on sys.path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.database import SessionLocal
from backend.services.auth_service import authenticate_user
from backend.utils.security import verify_password
from backend.models.user import User

# script to check if the admin user can authenticate correctly after the recent fixes to password hashing and authentication logic. Run this after creating an admin with create_admin.py and resetting the password with reset_admin.py.
def main():
    db = SessionLocal()
    u = db.query(User).filter(User.email=='admin_email').first()
    print('DB user:', u)
    print('password_hash prefix:', repr(u.password_hash)[:60])
    print('authenticate_user result:', authenticate_user(db,'admin_email','test'))
    print('verify_password result:', verify_password('test', u.password_hash))
    db.close()


if __name__ == '__main__':
    main()
