from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from backend.config import settings


def _get_fernet() -> Fernet:
    return Fernet(settings.PRIVATE_KEY_ENCRYPTION_KEY.encode())


def encrypt_private_key(private_key_pem: str) -> str:
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
            detail="We couldn't complete this secure operation. Please try again or contact support.",
        )