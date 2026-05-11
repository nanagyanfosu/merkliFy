# backend/services/status_service.py
"""
Certificate lifecycle management.

Handles all status transitions with:
  - State transition validation (REVOKED is terminal)
  - University ownership enforcement (issuers only touch their own certs)
  - Atomic two-write transaction (status update + history insert)
  - Full audit trail with who changed what, when, and why

TRANSITION RULES:
  ACTIVE    → REVOKED    ✓  (issuer or admin)
  ACTIVE    → SUSPENDED  ✓  (issuer or admin)
  SUSPENDED → REVOKED    ✓  (issuer or admin — escalation)
  SUSPENDED → ACTIVE     ✓  (issuer or admin — reinstatement)
  REVOKED   → anything   ✗  (terminal — blocked at service layer)
  X         → X          ✗  (no-op transitions blocked)
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.models.certificate import CertificateRecord
from backend.models.batch import CertificateBatch
from backend.models.status import (
    CertificateStatus,
    CertificateStatusHistory,
    CertificateLifecycleStatus,
)
from backend.models.user import User, UserRole
from backend.schemas.status import (
    StatusChangeRequest,
    StatusChangeResponse,
    CertificateStatusResponse,
    StatusHistoryEntry,
    CertificateSearchRequest,
)


# ---------------------------------------------------------------------------
# VALID TRANSITIONS TABLE
# ---------------------------------------------------------------------------
# Maps current_status → set of allowed new_status values.
# Any transition not in this table is rejected.
VALID_TRANSITIONS: dict[CertificateLifecycleStatus, set[CertificateLifecycleStatus]] = {
    CertificateLifecycleStatus.ACTIVE: {
        CertificateLifecycleStatus.REVOKED,
        CertificateLifecycleStatus.SUSPENDED,
    },
    CertificateLifecycleStatus.SUSPENDED: {
        CertificateLifecycleStatus.REVOKED,
        CertificateLifecycleStatus.ACTIVE,   # reinstatement
    },
    CertificateLifecycleStatus.REVOKED: set(),  # terminal — no transitions allowed
}


def change_certificate_status(
    db: Session,
    certificate_id: int,
    payload: StatusChangeRequest,
    requesting_user: User,
) -> StatusChangeResponse:
    """
    Changes a certificate's lifecycle status.

    Enforces:
      - Certificate exists
      - Requester has permission (issuer = own university only, admin = any)
      - Transition is valid per VALID_TRANSITIONS table
      - Two writes committed atomically

    Args:
        db:               Active SQLAlchemy session.
        certificate_id:   ID of the certificate to update.
        payload:          New status and optional reason.
        requesting_user:  The authenticated user making the change.

    Returns:
        StatusChangeResponse with full change details.
    """

    # ------------------------------------------------------------------ #
    # FETCH CERTIFICATE AND ITS BATCH
    # ------------------------------------------------------------------ #
    certificate = (
        db.query(CertificateRecord)
        .filter(CertificateRecord.id == certificate_id)
        .first()
    )

    if certificate is None:
        raise HTTPException(
            status_code=404,
            detail=f"Certificate with ID {certificate_id} not found.",
        )

    batch = (
        db.query(CertificateBatch)
        .filter(CertificateBatch.id == certificate.batch_id)
        .first()
    )

    # ------------------------------------------------------------------ #
    # PERMISSION CHECK — Issuers can only manage their own university's certs
    # ------------------------------------------------------------------ #
    if requesting_user.role == UserRole.ISSUER:
        if requesting_user.university_id != batch.university_id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You are not authorised to manage certificates from another institution. "
                    "This certificate belongs to a different university."
                ),
            )

    # Admin passes through — no university restriction

    # ------------------------------------------------------------------ #
    # FETCH CURRENT STATUS
    # ------------------------------------------------------------------ #
    status_record = (
        db.query(CertificateStatus)
        .filter(CertificateStatus.certificate_id == certificate_id)
        .first()
    )

    if status_record is None:
        # Defensive: should always exist after Phase 3 issuance.
        # Create it as ACTIVE rather than crashing.
        status_record = CertificateStatus(
            certificate_id=certificate_id,
            current_status=CertificateLifecycleStatus.ACTIVE,
        )
        db.add(status_record)
        db.flush()

    current_status = status_record.current_status
    new_status = payload.new_status

    # ------------------------------------------------------------------ #
    # NO-OP CHECK — Reject transitions to the same state
    # ------------------------------------------------------------------ #
    if current_status == new_status:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Certificate is already {current_status.value}. "
                "No change was made."
            ),
        )

    # ------------------------------------------------------------------ #
    # TRANSITION VALIDATION
    # ------------------------------------------------------------------ #
    allowed = VALID_TRANSITIONS.get(current_status, set())

    if new_status not in allowed:
        if current_status == CertificateLifecycleStatus.REVOKED:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This certificate has been revoked. Revocation is a terminal state "
                    "and cannot be reversed. If this is an error, contact the system administrator."
                ),
            )
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid status transition: {current_status.value} → {new_status.value}. "
                f"Allowed transitions from {current_status.value}: "
                f"{[s.value for s in allowed] if allowed else 'none (terminal state)'}."
            ),
        )

    # ------------------------------------------------------------------ #
    # ATOMIC TWO-WRITE TRANSACTION
    # ------------------------------------------------------------------ #
    # Write ①: Update current status record (mutable — designed for this)
    old_status = current_status
    status_record.current_status = new_status

    # Write ②: Insert history entry (immutable audit trail)
    history_entry = CertificateStatusHistory(
        certificate_id=certificate_id,
        old_status=old_status.value,
        new_status=new_status.value,
        changed_by=requesting_user.id,
        reason=payload.reason,
    )
    db.add(history_entry)

    # Single commit — both writes or neither
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to persist status change. Please try again.",
        )

    return StatusChangeResponse(
        certificate_id=certificate.id,
        serial_number=certificate.serial_number,
        fullname=certificate.fullname,
        old_status=old_status,
        new_status=new_status,
        changed_by_email=requesting_user.email,
        reason=payload.reason,
        message=(
            f"Certificate status changed from {old_status.value} "
            f"to {new_status.value} successfully."
        ),
    )


def get_certificate_status_detail(
    db: Session,
    certificate_id: int,
    requesting_user: User,
) -> CertificateStatusResponse:
    """
    Returns the full status detail for a certificate including its audit history.

    Used by the issuer dashboard when an issuer pulls up a certificate
    to review before making a lifecycle decision.

    Scoped: issuers see only their own university's certificates.
    Admins see any certificate.
    """
    certificate = (
        db.query(CertificateRecord)
        .filter(CertificateRecord.id == certificate_id)
        .first()
    )

    if certificate is None:
        raise HTTPException(status_code=404, detail="Certificate not found.")

    batch = (
        db.query(CertificateBatch)
        .filter(CertificateBatch.id == certificate.batch_id)
        .first()
    )

    # Ownership check for issuers
    if requesting_user.role == UserRole.ISSUER:
        if requesting_user.university_id != batch.university_id:
            raise HTTPException(
                status_code=403,
                detail="You are not authorised to view certificates from another institution.",
            )

    status_record = (
        db.query(CertificateStatus)
        .filter(CertificateStatus.certificate_id == certificate_id)
        .first()
    )

    current_status = (
        status_record.current_status
        if status_record
        else CertificateLifecycleStatus.ACTIVE
    )

    # Fetch full history ordered oldest → newest
    history_raw = (
        db.query(CertificateStatusHistory, User)
        .join(User, CertificateStatusHistory.changed_by == User.id)
        .filter(CertificateStatusHistory.certificate_id == certificate_id)
        .order_by(CertificateStatusHistory.changed_at.asc())
        .all()
    )

    history = [
        StatusHistoryEntry(
            id=h.id,
            old_status=h.old_status,
            new_status=h.new_status,
            changed_by_email=u.email,
            reason=h.reason,
            changed_at=h.changed_at.isoformat(),
        )
        for h, u in history_raw
    ]

    return CertificateStatusResponse(
        certificate_id=certificate.id,
        serial_number=certificate.serial_number,
        fullname=certificate.fullname,
        program=certificate.program,
        graduation_year=certificate.graduation_year,
        issuer=certificate.issuer,
        current_status=current_status,
        batch_id=batch.id,
        batch_name=batch.batch_name,
        history=history,
    )


def search_certificates(
    db: Session,
    search: CertificateSearchRequest,
    requesting_user: User,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """
    Searches certificates for the dashboard lookup.

    This is how an issuer finds a certificate before revoking or suspending it.
    At least one search field must be provided to prevent full-table dumps.

    Scoped: issuers only see their own university's certificates.
    Admins see all.

    Returns a paginated dict with total count and matching records.
    """
    # Require at least one search field
    if not any([
        search.serial_number,
        search.fullname,
        search.program,
        search.graduation_year,
    ]):
        raise HTTPException(
            status_code=400,
            detail="At least one search field must be provided.",
        )

    query = db.query(CertificateRecord)

    # Scope to university for issuers
    if requesting_user.role == UserRole.ISSUER:
        if requesting_user.university_id is None:
            raise HTTPException(
                status_code=403,
                detail="Your account is not linked to any university.",
            )
        # Join through batch to filter by university
        query = query.join(
            CertificateBatch,
            CertificateRecord.batch_id == CertificateBatch.id
        ).filter(
            CertificateBatch.university_id == requesting_user.university_id
        )

    # Apply search filters
    if search.serial_number:
        query = query.filter(
            CertificateRecord.serial_number.ilike(
                f"%{search.serial_number.strip().lower()}%"
            )
        )

    if search.fullname:
        query = query.filter(
            CertificateRecord.fullname.ilike(
                f"%{search.fullname.strip().lower()}%"
            )
        )

    if search.program:
        query = query.filter(
            CertificateRecord.program.ilike(
                f"%{search.program.strip().lower()}%"
            )
        )

    if search.graduation_year:
        query = query.filter(
            CertificateRecord.graduation_year == search.graduation_year
        )

    total = query.count()
    records = (
        query
        .order_by(CertificateRecord.serial_number.asc())
        .offset(offset)
        .limit(min(limit, 100))
        .all()
    )

    # Enrich each record with its current status
    results = []
    for cert in records:
        status_record = (
            db.query(CertificateStatus)
            .filter(CertificateStatus.certificate_id == cert.id)
            .first()
        )
        results.append({
            "certificate_id": cert.id,
            "serial_number": cert.serial_number,
            "fullname": cert.fullname,
            "program": cert.program,
            "graduation_year": cert.graduation_year,
            "issuer": cert.issuer,
            "current_status": (
                status_record.current_status.value
                if status_record
                else "ACTIVE"
            ),
            "batch_id": cert.batch_id,
        })

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "results": results,
    }


def get_status_history_for_university(
    db: Session,
    university_id: int,
    requesting_user: User,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """
    Returns the full status change history across all certificates
    for a given university. Used for the admin audit view.

    Issuers can only query their own university_id.
    Admins can query any.
    """
    if requesting_user.role == UserRole.ISSUER:
        if requesting_user.university_id != university_id:
            raise HTTPException(
                status_code=403,
                detail="You can only view audit history for your own institution.",
            )

    # Join through certificate → batch to scope by university
    query = (
        db.query(CertificateStatusHistory, CertificateRecord, User)
        .join(
            CertificateRecord,
            CertificateStatusHistory.certificate_id == CertificateRecord.id
        )
        .join(
            CertificateBatch,
            CertificateRecord.batch_id == CertificateBatch.id
        )
        .join(
            User,
            CertificateStatusHistory.changed_by == User.id
        )
        .filter(CertificateBatch.university_id == university_id)
        .order_by(CertificateStatusHistory.changed_at.desc())
    )

    total = query.count()
    rows = query.offset(offset).limit(min(limit, 500)).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "history": [
            {
                "history_id": h.id,
                "certificate_id": c.id,
                "serial_number": c.serial_number,
                "fullname": c.fullname,
                "old_status": h.old_status,
                "new_status": h.new_status,
                "changed_by": u.email,
                "reason": h.reason,
                "changed_at": h.changed_at.isoformat(),
            }
            for h, c, u in rows
        ],
    }