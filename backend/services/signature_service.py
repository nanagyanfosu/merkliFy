# backend/services/signature_service.py
"""
RSA key pair generation and Merkle Root signing.

Private keys are generated here, immediately encrypted via key_encryption_service,
and never returned to callers outside this module or key_encryption_service.
"""
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature
import base64

from backend.services.key_encryption_service import encrypt_private_key, decrypt_private_key


def generate_rsa_key_pair() -> tuple[str, str]:
    """
    Generates a 2048-bit RSA key pair.

    Returns:
        (encrypted_private_key_str, public_key_pem_str)

        The first element is already Fernet-encrypted — safe for DB storage.
        The second element is a plaintext PEM public key — also safe for DB storage.

    Note: The raw private key PEM exists only transiently inside this function.
    It is encrypted before being returned and never stored unencrypted.
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend(),
    )

    # Serialize private key to PEM — exists only in local scope
    private_key_pem: str = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    # Serialize public key to PEM — safe to store as plaintext
    public_key_pem: str = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

    # Encrypt the private key immediately before returning
    encrypted_private_key_str = encrypt_private_key(private_key_pem)

    # private_key_pem goes out of scope here — it is never returned
    return encrypted_private_key_str, public_key_pem


def sign_merkle_root(merkle_root_hex: str, university) -> str:
    """
    Signs a Merkle Root using the university's RSA private key.

    Args:
        merkle_root_hex: The hex-encoded SHA-256 Merkle Root to sign.
        university: A University ORM instance with `encrypted_private_key` populated.

    Returns:
        Base64-encoded RSA signature string — safe for DB storage and verification.

    The private key is decrypted in-memory, used immediately, and goes out of scope
    when this function returns. It is never returned or stored beyond this call.
    """
    if not university.encrypted_private_key:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=500,
            detail="This institution is not ready to issue certificates yet. Please contact an administrator.",
        )

    # Decrypt — lives only in this local scope
    private_key_pem = decrypt_private_key(university.encrypted_private_key)

    private_key = serialization.load_pem_private_key(
        private_key_pem.encode("utf-8"),
        password=None,
        backend=default_backend(),
    )

    signature: bytes = private_key.sign(
        merkle_root_hex.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )

    # private_key_pem and private_key go out of scope here
    return base64.b64encode(signature).decode("utf-8")


def verify_merkle_root_signature(
    merkle_root_hex: str,
    signature_b64: str,
    public_key_pem: str,
) -> bool:
    """
    Verifies a Merkle Root signature using a university's RSA public key.

    This function uses only the PUBLIC key — no decryption occurs here.
    Safe to call from the public verification endpoint.

    Returns:
        True if the signature is valid, False otherwise.
    """
    public_key = serialization.load_pem_public_key(
        public_key_pem.encode("utf-8"),
        backend=default_backend(),
    )

    signature_bytes = base64.b64decode(signature_b64)

    try:
        public_key.verify(
            signature_bytes,
            merkle_root_hex.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except InvalidSignature:
        return False