# backend/routers/issuer.py
"""
Issuer-facing endpoints.

All routes require a valid JWT with role=ISSUER.
The issuer can only operate on their own university's data —
university_id is always read from the JWT, never from the request body.
This prevents one issuer from writing or reading another's certificates.
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_issuer
from backend.models.user import User
from backend.schemas.certificate import BatchUploadResponse
from backend.services import upload_service, batch_service

router = APIRouter(prefix="/issuer", tags=["issuer"])


@router.post(
    "/batches/upload",
    response_model=BatchUploadResponse,
    summary="Upload a certificate batch (CSV or JSON)",
    description=(
        "Accepts a CSV or JSON file of certificate records. "
        "Parses, validates, hashes, builds a Merkle Tree, signs the root, "
        "and atomically persists the full batch. "
        "The issuer's university_id is read from their JWT — not user-supplied."
    ),
)
async def upload_batch(
    file: UploadFile = File(..., description="CSV or JSON certificate dataset"),
    batch_name: str = Form(..., description="Human-readable name for this batch, e.g. '2025 Graduates'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    # Guard: issuer must be linked to a university
    if current_user.university_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not associated with any university. Contact an administrator.",
        )

    # Guard: force password change before any issuance
    if current_user.is_temp_password:
        raise HTTPException(
            status_code=403,
            detail="You must change your temporary password before uploading certificates.",
        )

    # Guard: validate file content type header (defence-in-depth — extension is
    # also checked inside upload_service, so this is an early rejection)
    allowed_content_types = {
        "text/csv",
        "application/csv",
        "application/json",
        "text/plain",          # Some systems send CSV as text/plain
        "application/octet-stream",  # Generic fallback — let extension decide
    }
    if file.content_type and file.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unexpected content type '{file.content_type}'. Upload a .csv or .json file.",
        )

    # Read the full file into memory
    # MAX_BATCH_SIZE check in upload_service prevents memory abuse
    raw_bytes = await file.read()

    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Parse + validate rows
    validated_rows = upload_service.parse_upload(file, raw_bytes)

    # Run the full cryptographic pipeline + persist
    return batch_service.process_batch(
        db=db,
        university_id=current_user.university_id,
        batch_name=batch_name,
        validated_rows=validated_rows,
    )


@router.get(
    "/batches",
    summary="List all batches issued by this university",
)
def list_batches(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    if current_user.university_id is None:
        raise HTTPException(status_code=403, detail="Account not linked to a university.")

    return batch_service.get_batches_for_university(db, current_user.university_id)


@router.get(
    "/batches/{batch_id}",
    summary="Get full detail for a single batch",
)
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_issuer),
):
    if current_user.university_id is None:
        raise HTTPException(status_code=403, detail="Account not linked to a university.")

    return batch_service.get_batch_detail(db, batch_id, current_user.university_id)