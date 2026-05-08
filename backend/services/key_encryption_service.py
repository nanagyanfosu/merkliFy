# backend/services/key_encryption_service.py
"""
Handles symmetric encryption and decryption of RSA private keys
using Fernet (AES-128-CBC + HMAC-SHA256).

RULES:
  - decrypt_private_key() is called ONLY inside signing operations.
  - The decrypted bytes are used immediately and never stored or returned.
  - No function in this module returns a private key to a router or schema.
"""
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from backend.config import settings


def _get_fernet() -> Fernet:
    """
    Constructs a Fernet instance from the configured encryption key.
    Called fresh on each operation — no module-level state holding the key.
    """
    return Fernet(settings.PRIVATE_KEY_ENCRYPTION_KEY.encode())


def encrypt_private_key(private_key_pem: str) -> str:
    """
    Encrypts a PEM-encoded RSA private key.

    Returns:
        A Fernet token (URL-safe base64 string) safe for DB storage.
        This ciphertext is authenticated — any tampering causes decryption failure.
    """
    fernet = _get_fernet()
    ciphertext: bytes = fernet.encrypt(private_key_pem.encode("utf-8"))
    # Fernet.encrypt() already returns URL-safe base64 bytes; decode to str for DB storage.
    return ciphertext.decode("utf-8")


def decrypt_private_key(encrypted_pem: str) -> str:
    """
    Decrypts a stored Fernet token back to a PEM-encoded RSA private key.

    This function should be called only within signing service internals.
    The returned string must be used immediately for cryptographic operations
    and must never be:
      - returned from a route handler
      - included in a Pydantic response model
      - logged or printed
      - stored in any variable beyond the immediate signing scope

    Raises:
        HTTPException(500) if decryption fails (wrong key or tampered ciphertext).
    """
    fernet = _get_fernet()
    try:
        plaintext: bytes = fernet.decrypt(encrypted_pem.encode("utf-8"))
        return plaintext.decode("utf-8")
    except InvalidToken:
        # Do NOT expose the reason — just signal internal failure.
        raise HTTPException(
            status_code=500,
            detail="Internal cryptographic error. Contact system administrator.",
        )