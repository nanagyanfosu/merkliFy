import csv
import json
import io
import re
from fastapi import HTTPException, UploadFile
from pydantic import BaseModel, field_validator, ValidationError
from typing import Optional



MAX_BATCH_SIZE = 10_000
ALLOWED_EXTENSIONS = {".csv", ".json"}


class CertificateRowInput(BaseModel):
    """
    Canonical fields are lowercased and stripped on validation.
    This ensures the stored value, the hash input, and the
    verification lookup all use the same normalised form.
    """
    serial_number:   str
    fullname:        str
    program:         str
    graduation_year: int
    issuer:          str

    # Optional metadata — stored as-is, not included in hash
    student_id:     Optional[str] = None
    classification: Optional[str] = None
    issue_date:     Optional[str] = None

    @field_validator("serial_number", "fullname", "program", "issuer")
    @classmethod
    def normalise_and_validate(cls, v: str) -> str:
        v = v.strip().lower()            # ← normalise here, not just strip
        if not v:
            raise ValueError("Field cannot be empty")
        if "|" in v:
            raise ValueError("Field must not contain the '|' character")
        return v

    @field_validator("graduation_year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        if not (1900 <= v <= 2100):
            raise ValueError(f"graduation_year {v} is outside the valid range 1900–2100")
        return v

    @field_validator("issue_date", mode="before")
    @classmethod
    def validate_issue_date(cls, v) -> Optional[str]:
        if v is None or v == "":
            return None
        v = str(v).strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("issue_date must be YYYY-MM-DD format")
        return v


def parse_upload(file: UploadFile, raw_bytes: bytes) -> list[CertificateRowInput]:
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

    if not rows:
        raise HTTPException(status_code=400, detail="Uploaded file contains no rows.")
    if len(rows) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Batch too large. Max {MAX_BATCH_SIZE} certificates per upload.",
        )

    validated = _validate_rows(rows)
    _check_intra_batch_duplicates(validated)
    return validated


def _get_extension(filename: str) -> str:
    return ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""


def _parse_csv(raw_bytes: bytes) -> list[dict]:
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded.")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV has no header row.")

    return [
        {k.strip().lower(): (v.strip() if v else "") for k, v in row.items()}
        for row in reader
    ]


def _parse_json(raw_bytes: bytes) -> list[dict]:
    try:
        data = json.loads(raw_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict) and "certificates" in data:
        rows = data["certificates"]
    else:
        raise HTTPException(
            status_code=400,
            detail="JSON must be an array or an object with a 'certificates' key.",
        )

    return [{k.strip().lower(): v for k, v in r.items()} for r in rows]


def _validate_rows(rows: list[dict]) -> list[CertificateRowInput]:
    validated, errors = [], []

    for i, row in enumerate(rows, start=1):
        try:
            validated.append(CertificateRowInput(**row))
        except ValidationError as e:
            for err in e.errors():
                errors.append({
                    "row": i,
                    "field": " → ".join(str(l) for l in err["loc"]),
                    "error": err["msg"],
                })

    if errors:
        raise HTTPException(
            status_code=422,
            detail={"message": f"Validation failed on {len(errors)} field(s).", "errors": errors},
        )
    return validated


def _check_intra_batch_duplicates(validated: list[CertificateRowInput]) -> None:
    seen, dupes = {}, []
    for i, cert in enumerate(validated):
        sn = cert.serial_number   # already normalised to lowercase
        if sn in seen:
            dupes.append({"serial_number": sn, "first_at_row": seen[sn] + 1, "duplicate_at_row": i + 1})
        else:
            seen[sn] = i

    if dupes:
        raise HTTPException(
            status_code=400,
            detail={"message": "Duplicate serial_numbers in this file.", "duplicates": dupes},
        )