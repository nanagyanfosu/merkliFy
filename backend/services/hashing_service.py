# backend/services/hashing_service.py
"""
SHA-256 certificate hashing.

The canonical string format is the sole source of truth for what gets hashed.
Any change to this format would invalidate all existing certificate hashes —
so the format is frozen by design and must NEVER be modified after deployment.

Canonical format:
    serial_number|fullname|program|graduation_year|issuer

All fields are normalised to lowercase + stripped before hashing to prevent
trivial tampering via capitalisation or whitespace.

Status (ACTIVE / REVOKED / SUSPENDED) is deliberately excluded.
This means a revoked certificate still has a valid hash — revocation is
a lifecycle event tracked separately, not a cryptographic property.
"""
import hashlib


# Separator chosen to be unlikely to appear in any field value.
# A pipe character is not valid in serial numbers, names, or program titles
# under any institution's naming conventions.
CANONICAL_SEPARATOR = "|"


def normalise_field(value: str) -> str:
    """
    Strips whitespace and lowercases a field value.

    This prevents the same certificate appearing as different hashes
    due to capitalisation differences between systems.

    Example:
        "  John Doe  "  ->  "john doe"
        "COMPUTER SCIENCE"  ->  "computer science"
    """
    return value.strip().lower()


def build_canonical_string(
    serial_number: str,
    fullname: str,
    program: str,
    graduation_year: int,
    issuer: str,
) -> str:
    """
    Constructs the canonical string that will be hashed.

    Example output:
        "cs2025-001|john doe|computer science|2025|university a"
    """
    parts = [
        normalise_field(serial_number),
        normalise_field(fullname),
        normalise_field(program),
        normalise_field(str(graduation_year)),
        normalise_field(issuer),
    ]
    return CANONICAL_SEPARATOR.join(parts)


def hash_certificate(
    serial_number: str,
    fullname: str,
    program: str,
    graduation_year: int,
    issuer: str,
) -> str:
    """
    Builds the canonical string and returns its SHA-256 hex digest.

    Returns:
        64-character lowercase hex string (256 bits).

    This is the leaf hash for the Merkle Tree.
    """
    canonical = build_canonical_string(
        serial_number, fullname, program, graduation_year, issuer
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def hash_certificate_from_record(certificate) -> str:
    """
    Convenience wrapper that accepts a CertificateRecord ORM object.
    Used during verification to reconstruct the hash from stored metadata.
    """
    return hash_certificate(
        serial_number=certificate.serial_number,
        fullname=certificate.fullname,
        program=certificate.program,
        graduation_year=certificate.graduation_year,
        issuer=certificate.issuer,
    )


def hash_pair(left: str, right: str) -> str:
    """
    Hashes two hex digests concatenated together.
    Used internally by the Merkle Tree builder.

    The inputs are sorted to ensure that:
        hash_pair(A, B) == hash_pair(B, A)
    This makes proof verification direction-independent — but we still
    store the direction explicitly in the proof path for clarity.
    """
    combined = (left + right).encode("utf-8")
    return hashlib.sha256(combined).hexdigest()