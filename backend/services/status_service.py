from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
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
    db:              Session,
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

        batch = cert.batch or db.query(CertificateBatch).filter(
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
    if isinstance(old_status, str):
        try:
            old_status = CertificateLifecycleStatus(old_status)
        except ValueError:
            pass

    new_status = payload.new_status
    if isinstance(new_status, str):
        try:
            new_status = CertificateLifecycleStatus(new_status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid new status '{new_status}'."
            )

    reason = payload.reason

    if old_status == CertificateLifecycleStatus.REVOKED:
        raise HTTPException(
            status_code=400,
            detail="This certificate is already revoked. Revocation is final."
        )
    if old_status == new_status:
        raise HTTPException(
            status_code=400,
            detail=f"Certificate is already {new_status.value if hasattr(new_status, 'value') else new_status}."
        )

    if new_status not in VALID_TRANSITIONS.get(old_status, set()):
        old_val = old_status.value if hasattr(old_status, 'value') else str(old_status)
        new_val = new_status.value if hasattr(new_status, 'value') else str(new_status)
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition certificate from {old_val} to {new_val}."
        )

    status_record.current_status = new_status
    db.add(CertificateStatusHistory(
        certificate_id=certificate_id,
        changed_by=requesting_user.id,
        old_status=old_status.value if hasattr(old_status, 'value') else str(old_status),
        new_status=new_status.value if hasattr(new_status, 'value') else str(new_status),
        reason=reason,
    ))
    db.commit()
    db.refresh(status_record)

    return StatusChangeResponse(
        certificate_id=certificate_id,
        serial_number=cert.serial_number,
        fullname=cert.fullname,
        old_status=old_status,
        new_status=new_status,
        changed_by_email=requesting_user.email,
        reason=reason,
        message=f"Status changed to {new_status.value if hasattr(new_status, 'value') else new_status}.",
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

    # Scoped: issuers see only their own university's certificates
    if requesting_user.role == UserRole.ISSUER:
        if requesting_user.university_id != certificate.university_id:
            raise HTTPException(
                status_code=403,
                detail="You are not authorised to view certificates from another institution.",
            )

    batch = certificate.batch or db.query(CertificateBatch).filter(
        CertificateBatch.id == certificate.batch_id
    ).first()

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
    if isinstance(current_status, str):
        try:
            current_status = CertificateLifecycleStatus(current_status)
        except ValueError:
            pass

    # Fetch full history ordered oldest → newest
    history_raw = (
        db.query(CertificateStatusHistory, User)
        .outerjoin(User, CertificateStatusHistory.changed_by == User.id)
        .filter(CertificateStatusHistory.certificate_id == certificate_id)
        .order_by(CertificateStatusHistory.changed_at.asc())
        .all()
    )

    history = [
        StatusHistoryEntry(
            id=h.id,
            old_status=h.old_status,
            new_status=h.new_status,
            changed_by_email=u.email if u else "System",
            reason=h.reason,
            changed_at=h.changed_at.isoformat() if hasattr(h.changed_at, "isoformat") else str(h.changed_at or ""),
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
        batch_id=batch.id if batch else certificate.batch_id,
        batch_name=batch.batch_name if batch else "Unknown Batch",
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

    # Apply search filters
    has_filter = any([
        search.serial_number,
        search.fullname,
        search.program,
        search.graduation_year is not None,
        search.status,
        search.academic_year is not None,
    ])

    if not has_filter:
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
        if search.serial_number:
            val = search.serial_number.strip()
            if search.exact_match:
                query = query.filter(CertificateRecord.serial_number.ilike(val))
            else:
                query = query.filter(
                    CertificateRecord.serial_number.ilike(f"%{val}%")
                )
        if search.fullname:
            val = search.fullname.strip()
            if search.exact_match:
                query = query.filter(CertificateRecord.fullname.ilike(val))
            else:
                query = query.filter(
                    CertificateRecord.fullname.ilike(f"%{val}%")
                )
        if search.program:
            val = search.program.strip()
            if search.exact_match:
                query = query.filter(CertificateRecord.program.ilike(val))
            else:
                query = query.filter(
                    CertificateRecord.program.ilike(f"%{val}%")
                )
        if search.graduation_year is not None:
            query = query.filter(
                CertificateRecord.graduation_year == search.graduation_year
            )
        if search.academic_year is not None:
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
            if status_enum == CertificateLifecycleStatus.ACTIVE:
                query = query.outerjoin(
                    CertificateStatus,
                    CertificateRecord.id == CertificateStatus.certificate_id
                ).filter(
                    or_(
                        CertificateStatus.current_status == status_enum,
                        CertificateStatus.current_status == None,
                    )
                )
            else:
                query = query.join(
                    CertificateStatus,
                    CertificateRecord.id == CertificateStatus.certificate_id
                ).filter(CertificateStatus.current_status == status_enum)

        sort_field = search.sort_by if hasattr(search, "sort_by") and search.sort_by else "serial_number"
        sort_col = getattr(CertificateRecord, sort_field, None) or CertificateRecord.serial_number
        sort_dir = getattr(search, "sort_dir", "asc") or "asc"
        query = query.order_by(
            sort_col.desc() if sort_dir.lower() == "desc"
            else sort_col.asc()
        )

    total = query.count()
    records = query.offset(offset).limit(min(limit, 200)).all()

    cert_ids = [r.id for r in records]
    status_map = {}
    if cert_ids:
        for s in db.query(CertificateStatus).filter(
            CertificateStatus.certificate_id.in_(cert_ids)
        ).all():
            status_map[s.certificate_id] = s.current_status

    # For issuers: fetch uploader names to show department context
    uploader_map = {}
    if requesting_user.role == UserRole.ISSUER and records:
        batch_ids = list({r.batch_id for r in records if r.batch_id})
        batches = db.query(CertificateBatch).filter(
            CertificateBatch.id.in_(batch_ids)
        ).all() if batch_ids else []
        uploader_ids = list({b.uploaded_by for b in batches if b.uploaded_by})
        uploaders = db.query(User).filter(User.id.in_(uploader_ids)).all() if uploader_ids else []
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
        raw_status = status_map.get(r.id, CertificateLifecycleStatus.ACTIVE)
        status_val = raw_status.value if hasattr(raw_status, "value") else str(raw_status)
        item = {
            "certificate_id":  r.id,
            "serial_number":   r.serial_number,
            "fullname":        r.fullname,
            "program":         r.program,
            "graduation_year": r.graduation_year,
            "issuer":          r.issuer,
            "current_status":  status_val,
            "batch_id":        r.batch_id,
            "academic_year":   r.batch.academic_year if hasattr(r, "batch") and r.batch else None,
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
        and bool(search.program or search.fullname)
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
        .outerjoin(
            CertificateBatch,
            CertificateRecord.batch_id == CertificateBatch.id
        )
        .outerjoin(
            User,
            CertificateStatusHistory.changed_by == User.id
        )
        .filter(
            or_(
                CertificateRecord.university_id == university_id,
                CertificateBatch.university_id == university_id,
            )
        )
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
                "changed_by": u.email if u else "Unknown",
                "reason": h.reason,
                "changed_at": h.changed_at.isoformat() if hasattr(h.changed_at, "isoformat") else str(h.changed_at or ""),
            }
            for h, c, u in rows
        ],
    }