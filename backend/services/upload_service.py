# backend/services/upload_service.py
"""
Parses uploaded CSV and JSON certificate datasets.

Responsibilities:
  - Detect file type from the uploaded filename extension
  - Parse raw bytes into row dictionaries
  - Validate each row against CertificateRowInput schema
  - Collect and surface ALL row-level errors before failing
    (so the issuer sees every problem in one response, not one at a time)
  - Reject datasets with duplicate serial_numbers within the same upload
  - Return a clean list of CertificateRowInput objects ready for hashing

This service performs NO database operations and NO cryptography.
"""
import csv
import json
import io
from fastapi import HTTPException, UploadFile
from pydantic import ValidationError

from backend.schemas.certificate import CertificateRowInput


MAX_BATCH_SIZE = 10_000   # Reject uploads larger than this to prevent memory abuse
ALLOWED_EXTENSIONS = {".csv", ".json"}


def parse_upload(file: UploadFile, raw_bytes: bytes) -> list[CertificateRowInput]:
    """
    Entry point for the upload pipeline.

    Detects file type, parses, validates, and deduplicates.

    Args:
        file:       The UploadFile object (used to read the filename/extension).
        raw_bytes:  The full file content read before calling this function.

    Returns:
        List of validated CertificateRowInput objects.

    Raises:
        HTTPException(400) for any parsing, validation, or duplication error.
    """
    filename = file.filename or ""
    ext = _get_extension(filename)

    if ext == ".csv":
        rows = _parse_csv(raw_bytes)
    elif ext == ".json":
        rows = _parse_json(raw_bytes)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Only .csv and .json are accepted.",
        )

    if len(rows) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file contains no certificate rows.")

    if len(rows) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Batch too large. Maximum is {MAX_BATCH_SIZE} certificates per upload.",
        )

    validated = _validate_rows(rows)
    _check_for_duplicates(validated)

    return validated


def _get_extension(filename: str) -> str:
    """Returns the lowercase file extension including the dot."""
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def _parse_csv(raw_bytes: bytes) -> list[dict]:
    """
    Parses CSV bytes into a list of row dictionaries.

    Uses DictReader so column names map directly to dict keys.
    Handles BOM-prefixed UTF-8 files (common from Excel exports).
    """
    try:
        text = raw_bytes.decode("utf-8-sig")   # utf-8-sig strips BOM if present
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="CSV file is not valid UTF-8. Please save as UTF-8 before uploading.",
        )

    reader = csv.DictReader(io.StringIO(text))

    # Normalise header names — strip whitespace and lowercase
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV file appears to be empty or has no header row.")

    rows = []
    for raw_row in reader:
        # Strip whitespace from both keys and values
        row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items()}
        rows.append(row)

    return rows


def _parse_json(raw_bytes: bytes) -> list[dict]:
    """
    Parses JSON bytes. Accepts either:
      - A JSON array of objects:  [{...}, {...}]
      - A JSON object with a "certificates" key: {"certificates": [{...}]}
    """
    try:
        text = raw_bytes.decode("utf-8")
        data = json.loads(text)
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="JSON file is not valid UTF-8.")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")

    # Accept both array and wrapped-object formats
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict) and "certificates" in data:
        rows = data["certificates"]
    else:
        raise HTTPException(
            status_code=400,
            detail=(
                "JSON must be either a top-level array of certificate objects, "
                "or an object with a 'certificates' key containing the array."
            ),
        )

    if not all(isinstance(r, dict) for r in rows):
        raise HTTPException(status_code=400, detail="Each certificate entry must be a JSON object.")

    # Normalise keys the same way as CSV
    return [
        {k.strip().lower(): v for k, v in row.items()}
        for row in rows
    ]


def _validate_rows(rows: list[dict]) -> list[CertificateRowInput]:
    """
    Validates every row against CertificateRowInput.

    Collects ALL errors across ALL rows before raising.
    This means an issuer with 50 bad rows sees all 50 problems at once
    rather than fixing them one at a time across 50 re-uploads.

    Returns:
        List of validated CertificateRowInput objects.

    Raises:
        HTTPException(422) with a structured error list if any row fails.
    """
    validated = []
    errors = []

    for i, row in enumerate(rows):
        row_number = i + 1   # 1-indexed for human-readable error messages
        try:
            validated.append(CertificateRowInput(**row))
        except ValidationError as e:
            for err in e.errors():
                field = " → ".join(str(loc) for loc in err["loc"])
                errors.append({
                    "row": row_number,
                    "field": field,
                    "error": err["msg"],
                })

    if errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": f"Validation failed for {len(errors)} field(s) across the uploaded file.",
                "errors": errors,
            },
        )

    return validated


def _check_for_duplicates(validated: list[CertificateRowInput]) -> None:
    """
    Ensures no two rows in this upload share the same serial_number.

    Serial numbers must be globally unique, but we can catch intra-batch
    duplicates here before touching the database.

    Raises:
        HTTPException(400) listing all duplicate serial numbers found.
    """
    seen = {}
    duplicates = []

    for i, cert in enumerate(validated):
        sn = cert.serial_number.lower()
        if sn in seen:
            duplicates.append({
                "serial_number": cert.serial_number,
                "first_seen_at_row": seen[sn] + 1,
                "duplicate_at_row": i + 1,
            })
        else:
            seen[sn] = i

    if duplicates:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Duplicate serial_numbers detected within the uploaded file.",
                "duplicates": duplicates,
            },
        )