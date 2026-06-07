import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.database import SessionLocal
from backend.models.user import User, UserRole

def diagnose(email: str, password: str):
    print("\n" + "="*55)
    print("  CACVS Login Diagnostic")
    print("="*55)

    db = SessionLocal()
    try:
        # ── Step 1: Does the user exist at all? ──────────────────
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"\n❌ STEP 1 FAILED — No user found with email: '{email}'")
            print("\n  All users currently in the database:")
            all_users = db.query(User).all()
            if not all_users:
                print("  (database is empty — no users at all)")
            else:
                for u in all_users:
                    print(f"  → id={u.id}  email='{u.email}'  role={u.role}")
            return
        print(f"\n✅ STEP 1 PASSED — User found: id={user.id}, role={user.role}")

        # ── Step 2: Does the stored hash look valid? ──────────────
        h = user.password_hash
        print(f"\n   Stored hash prefix: {h[:30]}...")
        if h.startswith("$2b$") or h.startswith("$2a$"):
            print("✅ STEP 2 PASSED — Hash is bcrypt format")
        elif h.startswith("$pbkdf2"):
            print("⚠️  STEP 2 WARNING — Hash is pbkdf2 format (not bcrypt)")
        else:
            print(f"❌ STEP 2 FAILED — Unrecognised hash format: {h[:20]}")

        # ── Step 3: Does verify_password work? ───────────────────
        from backend.utils.security import verify_password
        result = verify_password(password, user.password_hash)
        if result:
            print(f"\n✅ STEP 3 PASSED — verify_password() returned True")
            print("\n✅ All checks passed. The problem is elsewhere.")
            print("   Most likely cause: axios interceptor swallowing the 401.")
        else:
            print(f"\n❌ STEP 3 FAILED — verify_password() returned False")
            print("   The password does not match the stored hash.")
            print("   Fix: re-run create_admin.py to reset the password.")

        # ── Step 4: Try bcrypt directly ───────────────────────────
        try:
            import bcrypt as _bcrypt
            direct = _bcrypt.checkpw(
                password.encode("utf-8"),
                user.password_hash.encode("utf-8")
            )
            print(f"\n   Direct bcrypt.checkpw() result: {direct}")
            if direct and not result:
                print("   → passlib verify fails but raw bcrypt succeeds.")
                print("   → Root cause: passlib/bcrypt incompatibility.")
                print("   → Fix: replace passlib with direct bcrypt (see below).")
        except Exception as e:
            print(f"\n   bcrypt direct check error: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    email    = input("Enter the email you are trying to log in with: ").strip()
    password = input("Enter the password: ").strip()
    diagnose(email, password)