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
    db:             Session,
    certificate_id: int,
    payload:        StatusChangeRequest,
    requesting_user: User,
) -> StatusChangeResponse:
    cert = db.query(CertificateRecord).filter(
        CertificateRecord.id == certificate_id
    ).first()

    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")

    if requesting_user.role == UserRole.ISSUER:
        # Must be same university
        if cert.university_id != requesting_user.university_id:
            raise HTTPException(
                status_code=403,
                detail="You can only manage certificates from your institution."
            )

        batch = db.query(CertificateBatch).filter(
            CertificateBatch.id == cert.batch_id
        ).first()

        # Only the UPLOADER of the batch may change cert status.
        # Other issuers at the same university are view-only.
        if not batch or batch.uploaded_by != requesting_user.id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only revoke or suspend certificates from batches "
                    "you uploaded. This batch belongs to another department. "
                    "Contact a system administrator if action is required."
                ),
            )

    status_record = db.query(CertificateStatus).filter(
        CertificateStatus.certificate_id == certificate_id
    ).first()

    if not status_record:
        status_record = CertificateStatus(
            certificate_id=certificate_id,
            current_status=CertificateLifecycleStatus.ACTIVE,
        )
        db.add(status_record)
        db.flush()

    old_status = status_record.current_status
    new_status = payload.new_status
    reason = payload.reason

    if old_status == CertificateLifecycleStatus.REVOKED:
        raise HTTPException(
            status_code=400,
            detail="This certificate is already revoked. Revocation is final."
        )
    if old_status == new_status:
        raise HTTPException(
            status_code=400,
            detail=f"Certificate is already {new_status.value}."
        )

    if new_status not in VALID_TRANSITIONS.get(old_status, set()):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition certificate from {old_status.value} to {new_status.value}."
        )

    status_record.current_status = new_status
    db.add(CertificateStatusHistory(
        certificate_id=certificate_id,
        changed_by=requesting_user.id,
        old_status=old_status.value if isinstance(old_status, CertificateLifecycleStatus) else str(old_status),
        new_status=new_status.value if isinstance(new_status, CertificateLifecycleStatus) else str(new_status),
        reason=reason,
    ))
    db.commit()

    return StatusChangeResponse(
        certificate_id=certificate_id,
        serial_number=cert.serial_number,
        fullname=cert.fullname,
        old_status=old_status,
        new_status=new_status,
        changed_by_email=requesting_user.email,
        reason=reason,
        message=f"Status changed to {new_status.value}.",
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
    query = (
        db.query(CertificateRecord)
        .join(CertificateBatch,
              CertificateRecord.batch_id == CertificateBatch.id)
    )

    # Issuers see ALL certificates from their university —
    # not just their own uploads. Data ownership is institutional.
    if requesting_user.role == UserRole.ISSUER:
        if not requesting_user.university_id:
            raise HTTPException(
                status_code=403,
                detail="Account not linked to a university."
            )
        query = query.filter(
            CertificateBatch.university_id == requesting_user.university_id
        )

    # Default sort for admins: by issuer/university
    # Default sort for issuers: by department (uploaded_by)
    if not search.serial_number and not search.fullname and \
       not search.program and not search.graduation_year and \
       not search.status and not search.academic_year:
        # No filters — load all with sensible default sort
        if requesting_user.role == UserRole.ISSUER:
            query = query.order_by(
                CertificateBatch.uploaded_by.asc(),
                CertificateRecord.serial_number.asc()
            )
        else:
            query = query.order_by(
                CertificateRecord.issuer.asc(),
                CertificateRecord.serial_number.asc()
            )
    else:
        # Apply search filters
        if search.serial_number:
            query = query.filter(
                CertificateRecord.serial_number.ilike(
                    search.serial_number.strip().lower()
                )
            )
        if search.fullname:
            val = search.fullname.strip().lower()
            if search.exact_match:
                query = query.filter(CertificateRecord.fullname.ilike(val))
            else:
                query = query.filter(
                    CertificateRecord.fullname.ilike(f"%{val}%")
                )
        if search.program:
            val = search.program.strip().lower()
            if search.exact_match:
                query = query.filter(CertificateRecord.program.ilike(val))
            else:
                query = query.filter(
                    CertificateRecord.program.ilike(f"%{val}%")
                )
        if search.graduation_year:
            query = query.filter(
                CertificateRecord.graduation_year == search.graduation_year
            )
        if search.academic_year:
            query = query.filter(
                CertificateBatch.academic_year == search.academic_year
            )
        if search.status:
            try:
                status_enum = CertificateLifecycleStatus(
                    search.status.upper()
                )
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid status '{search.status}'."
                )
            query = query.join(
                CertificateStatus,
                CertificateRecord.id == CertificateStatus.certificate_id
            ).filter(CertificateStatus.current_status == status_enum)

        sort_col = getattr(
            CertificateRecord,
            search.sort_by,
            CertificateRecord.serial_number
        )
        query = query.order_by(
            sort_col.desc() if search.sort_dir == "desc"
            else sort_col.asc()
        )

    total = query.count()
    records = query.offset(offset).limit(min(limit, 200)).all()

    cert_ids = [r.id for r in records]
    status_map = {
        s.certificate_id: s.current_status
        for s in db.query(CertificateStatus).filter(
            CertificateStatus.certificate_id.in_(cert_ids)
        ).all()
    }

    # For issuers: fetch uploader names to show department context
    uploader_map = {}
    if requesting_user.role == UserRole.ISSUER:
        batch_ids = list({r.batch_id for r in records})
        batches = db.query(CertificateBatch).filter(
            CertificateBatch.id.in_(batch_ids)
        ).all()
        uploader_ids = list({b.uploaded_by for b in batches if b.uploaded_by})
        uploaders = db.query(User).filter(User.id.in_(uploader_ids)).all()
        uploader_name_map = {
            u.id: (u.department or u.issuer_name or u.email)
            for u in uploaders
        }
        uploader_map = {
            b.id: uploader_name_map.get(b.uploaded_by, "Unknown")
            for b in batches
        }

    # Ownership map for issuer actions in mixed-batch certificate views.
    batch_ownership: set[int] = set()
    if requesting_user.role == UserRole.ISSUER:
        owned_batches = db.query(CertificateBatch.id).filter(
            CertificateBatch.uploaded_by == requesting_user.id
        ).all()
        batch_ownership = {b.id for b in owned_batches}

    results = []
    for r in records:
        item = {
            "certificate_id":  r.id,
            "serial_number":   r.serial_number,
            "fullname":        r.fullname,
            "program":         r.program,
            "graduation_year": r.graduation_year,
            "issuer":          r.issuer,
            "current_status":  status_map.get(
                r.id, CertificateLifecycleStatus.ACTIVE
            ).value,
            "batch_id":        r.batch_id,
            "academic_year":   r.batch.academic_year if r.batch else None,
            "is_owner":        (
                r.batch_id in batch_ownership
                if requesting_user.role == UserRole.ISSUER
                else True
            ),
        }
        if requesting_user.role == UserRole.ISSUER:
            item["uploaded_by_dept"] = uploader_map.get(r.batch_id, "—")
        results.append(item)

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