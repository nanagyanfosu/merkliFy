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


CANONICAL_SEPARATOR = "|"


def normalise_field(value: str) -> str:
    return value.strip().lower()


def build_canonical_string(
    serial_number: str,
    fullname: str,
    program: str,
    graduation_year: int,
    issuer: str,
) -> str:
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
    canonical = build_canonical_string(
        serial_number, fullname, program, graduation_year, issuer
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def hash_certificate_from_record(certificate) -> str:
    return hash_certificate(
        serial_number=certificate.serial_number,
        fullname=certificate.fullname,
        program=certificate.program,
        graduation_year=certificate.graduation_year,
        issuer=certificate.issuer,
    )


def hash_pair(left: str, right: str) -> str:
    combined = (left + right).encode("utf-8")
    return hashlib.sha256(combined).hexdigest()