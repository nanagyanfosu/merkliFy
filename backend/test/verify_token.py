import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.utils.security import create_access_token, decode_access_token
from backend.config import settings

print(f"SECRET_KEY loaded: '{settings.SECRET_KEY[:10]}...' (len={len(settings.SECRET_KEY)})")
print(f"ALGORITHM: {settings.ALGORITHM}")

# Generate a test token
token = create_access_token({"sub": "1", "role": "ADMIN"})
print(f"\nGenerated token (first 60 chars): {token[:60]}...")

# Decode it back
payload = decode_access_token(token)
print(f"Decoded payload: {payload}")

if payload:
    print("\n✅ Token sign/verify cycle works correctly.")
else:
    print("\n❌ decode_access_token returned None — SECRET_KEY or ALGORITHM mismatch.")