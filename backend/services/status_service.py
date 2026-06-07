from sqlalchemy.orm import Session
from fastapi import HTTPException
from sqlalchemy import or_
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


# VALID TRANSITIONS TABLE
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

    # FETCH CERTIFICATE AND ITS BATCH
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


    # PERMISSION CHECK — Issuers can only manage their own university's certs
    if requesting_user.role == UserRole.ISSUER:
        if requesting_user.university_id != batch.university_id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You are not authorised to manage certificates from another institution. "
                    "This certificate belongs to a different university."
                ),
            )

    # FETCH CURRENT STATUS
    status_record = (
        db.query(CertificateStatus)
        .filter(CertificateStatus.certificate_id == certificate_id)
        .first()
    )

    if status_record is None:
        status_record = CertificateStatus(
            certificate_id=certificate_id,
            current_status=CertificateLifecycleStatus.ACTIVE,
        )
        db.add(status_record)
        db.flush()

    current_status = status_record.current_status
    new_status = payload.new_status

    # NO-OP CHECK — Reject transitions to the same state
    if current_status == new_status:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Certificate is already {current_status.value}. "
                "No change was made."
            ),
        )


    # TRANSITION VALIDATION
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

    # ATOMIC TWO-WRITE TRANSACTION

    old_status = current_status
    status_record.current_status = new_status

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
    Searches certificate records with flexible filters and pagination.
    """

    # Require at least one search field to prevent unscoped full-table dumps
    has_filter = any([
        search.serial_number,
        search.fullname,
        search.program,
        search.graduation_year,
        search.status,
        search.academic_year,
    ])
    if not has_filter:
        raise HTTPException(
            status_code=400,
            detail="At least one search field is required.",
        )

    # Base query — always join batch for university scoping and year filter
    query = (
        db.query(CertificateRecord)
        .join(CertificateBatch, CertificateRecord.batch_id == CertificateBatch.id)
    )

    # Scope issuers to their own university — admins see everything
    if requesting_user.role == UserRole.ISSUER:
        if not requesting_user.university_id:
            raise HTTPException(status_code=403, detail="Account not linked to a university.")
        query = query.filter(
            CertificateBatch.university_id == requesting_user.university_id
        )

    # ── Text filters ──────────────────────────────────────────────────────────
    if search.serial_number:
        # Serial number: always exact case-insensitive (it is an identifier)
        query = query.filter(
            CertificateRecord.serial_number.ilike(search.serial_number.strip().lower())
        )

    if search.fullname:
        val = search.fullname.strip().lower()
        if search.exact_match:
            query = query.filter(CertificateRecord.fullname.ilike(val))
        else:
            query = query.filter(CertificateRecord.fullname.ilike(f"%{val}%"))

    if search.program:
        val = search.program.strip().lower()
        if search.exact_match:
            # Exact match: the full program string must match exactly
            query = query.filter(CertificateRecord.program.ilike(val))
        else:
            # Contains: useful for discovery but can return broad results.
            # UI should warn the user when result count is high.
            query = query.filter(CertificateRecord.program.ilike(f"%{val}%"))

    if search.graduation_year:
        query = query.filter(
            CertificateRecord.graduation_year == search.graduation_year
        )

    # ── Academic year (via batch) ─────────────────────────────────────────────
    if search.academic_year:
        query = query.filter(
            CertificateBatch.academic_year == search.academic_year
        )

    # ── Status filter (via certificate_status join) ───────────────────────────
    if search.status:
        try:
            status_enum = CertificateLifecycleStatus(search.status.upper())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status '{search.status}'. Use ACTIVE, REVOKED, or SUSPENDED.",
            )
        query = (
            query
            .join(CertificateStatus,
                  CertificateRecord.id == CertificateStatus.certificate_id)
            .filter(CertificateStatus.current_status == status_enum)
        )

    # ── Sorting ───────────────────────────────────────────────────────────────
    sort_col = getattr(CertificateRecord, search.sort_by, CertificateRecord.serial_number)
    query = query.order_by(
        sort_col.desc() if search.sort_dir == "desc" else sort_col.asc()
    )

    total = query.count()
    records = query.offset(offset).limit(min(limit, 200)).all()

    # Enrich with current status (avoid N+1 by batch loading)
    cert_ids = [r.id for r in records]
    status_map = {
        s.certificate_id: s.current_status
        for s in db.query(CertificateStatus)
        .filter(CertificateStatus.certificate_id.in_(cert_ids))
        .all()
    }

    results = [
        {
            "certificate_id":  r.id,
            "serial_number":   r.serial_number,
            "fullname":        r.fullname,
            "program":         r.program,
            "graduation_year": r.graduation_year,
            "issuer":          r.issuer,
            "current_status":  status_map.get(r.id, CertificateLifecycleStatus.ACTIVE).value,
            "batch_id":        r.batch_id,
            "academic_year":   r.batch.academic_year if r.batch else None,
        }
        for r in records
    ]

    # Warn when contains search returns a very broad result set
    broad_warning = (
        not search.exact_match
        and total > 50
        and (search.program or search.fullname)
    )

    return {
        "total":         total,
        "offset":        offset,
        "limit":         limit,
        "results":       results,
        "broad_warning": broad_warning,
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