from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel as PydanticBase, validator

from backend.database import get_db
from backend.dependencies import require_admin
from backend.models.user import User, UserRole
from backend.schemas.university import CreateUniversityRequest, RegisterUniversityResponse
from backend.services import issuer_registry_service
from backend.services.auth_service import (
    create_issuer_account,
    reset_issuer_password,
)
from backend.models.status import CertificateStatusHistory
from backend.models.certificate import CertificateRecord
from backend.models.university import University, TrustStatus
from datetime import datetime, timezone
from backend.models.verification_log import VerificationLog
from backend.services.status_service import (
    search_certificates,
    get_certificate_status_detail,
    change_certificate_status,
    get_status_history_for_university,
)
from backend.schemas.status import StatusChangeRequest, CertificateSearchRequest
from backend.models.verification_log import VerificationLog
from backend.models.university import University


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard-summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Full dashboard summary for the admin home screen.
    Includes universities, issuers, recent activity, and anomalies.
    """
    from backend.models.university import University, TrustStatus
    from backend.models.batch import CertificateBatch
    from backend.models.certificate import CertificateRecord
    from backend.models.verification_log import VerificationLog
    from backend.models.status import CertificateStatusHistory
    from datetime import datetime, timezone, timedelta

    now = datetime.now(timezone.utc)
    last_7_days = now - timedelta(days=7)
    last_24h    = now - timedelta(hours=24)

    # University counts
    all_unis      = db.query(University).all()
    trusted_unis  = [u for u in all_unis if u.trust_status == TrustStatus.TRUSTED]
    pending_unis  = [u for u in all_unis if u.trust_status == TrustStatus.PENDING]

    # Issuer accounts
    all_issuers = db.query(User).filter(User.role == UserRole.ISSUER).all()
    pending_issuers_raw = [u for u in all_issuers if u.is_temp_password]

    # For pending issuers — find who created them (via status history is
    # not applicable here; we use created_at ordering as a proxy.
    # Better: add a created_by FK to users — for now return email + created_at)
    uni_map = {u.id: u.university_name for u in all_unis}
    admin_accounts = db.query(User).filter(
        User.role == UserRole.ADMIN
    ).all()
    # We'll show the admin who most recently created an account
    # as a simplification until created_by is added
    admin_email = admin_accounts[0].email if admin_accounts else "system"

    pending_issuers = [
        {
            "id":              u.id,
            "email":           u.email,
            "issuer_name":     u.issuer_name,
            "department":      u.department,
            "department_code": u.department_code,
            "university_name": uni_map.get(u.university_id, "Unknown"),
            "created_at":      u.created_at.isoformat(),
            "created_by":      admin_email,
        }
        for u in pending_issuers_raw
    ]

    # Batches last 7 days
    recent_batches = db.query(CertificateBatch).filter(
        CertificateBatch.created_at >= last_7_days
    ).count()

    # Verifications today vs yesterday
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    verifications_today = db.query(VerificationLog).filter(
        VerificationLog.timestamp >= today_start
    ).count()
    verifications_yesterday = db.query(VerificationLog).filter(
        VerificationLog.timestamp >= yesterday_start,
        VerificationLog.timestamp < today_start,
    ).count()

    # Anomalies last 24h
    anomaly_types = [
        "TAMPERED", "DATA_TAMPERED",
        "BATCH_TAMPER_DETECTED", "UNTRUSTED_ISSUER"
    ]
    recent_anomalies = db.query(VerificationLog).filter(
        VerificationLog.timestamp >= last_24h,
        VerificationLog.verification_result.in_(anomaly_types),
    ).count()

    # Recent status changes
    recent_changes = db.query(CertificateStatusHistory).filter(
        CertificateStatusHistory.changed_at >= last_7_days
    ).count()

    return {
        "universities": {
            "total":   len(all_unis),
            "trusted": len(trusted_unis),
            "pending": len(pending_unis),
            "pending_list": [
                {
                    "id":              u.id,
                    "university_code": u.university_code,
                    "university_name": u.university_name,
                    "location":        u.location,
                    "registered_on":   u.created_at.isoformat(),
                }
                for u in pending_unis
            ],
        },
        "issuers": {
            "total":         len(all_issuers),
            "pending_login": len(pending_issuers_raw),
            "pending_list":  pending_issuers,
        },
        "activity": {
            "batches_last_7_days":       recent_batches,
            "verifications_today":       verifications_today,
            "verifications_yesterday":   verifications_yesterday,
            "anomalies_last_24h":        recent_anomalies,
            "status_changes_last_7_days": recent_changes,
        },
    }

#  Universities 

@router.post("/universities", response_model=RegisterUniversityResponse)
def register_university(
    payload: CreateUniversityRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return issuer_registry_service.register_university(db, payload, admin)


@router.get("/universities")
def list_universities(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):

    return issuer_registry_service.list_universities_with_issuers(db)


@router.patch("/universities/{university_id}/trust")
def set_trust_status(
    university_id: int,
    status: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return issuer_registry_service.update_trust_status(db, university_id, status)


#  Issuer Accounts ─

class CreateIssuerRequest(PydanticBase):
    email:         str
    university_id: int
    issuer_name:   str = ""    # e.g. "Dr. Kwame Mensah" or "Registrar's Office"
    department:    str = ""    # e.g. "Department of Computer Science"

    @validator("issuer_name")
    def issuer_name_not_empty(cls, v):
        if len(v.strip()) < 2:
            raise ValueError("Issuer name must be at least 2 characters.")
        return v.strip()

@router.post("/issuers")
def create_issuer(
    payload: CreateIssuerRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user, temp_password = create_issuer_account(
        db=db,
        email=payload.email,
        university_id=payload.university_id,
        created_by=admin,
        issuer_name=payload.issuer_name,
        department=payload.department,
    )
    return {
        "id":               user.id,
        "email":            user.email,
        "department_code":  user.department_code,
        "issuer_name":      user.issuer_name,
        "department":       user.department,
        "university_id":    user.university_id,
        "temp_password":    temp_password,
        "message": (
            "Issuer account created. Share this password securely — "
            "it will not be shown again."
        ),
    }


@router.post("/issuers/{user_id}/reset-password")
def reset_password(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user, new_password = reset_issuer_password(db, user_id, admin)
    return {
        "email":        user.email,
        "new_password": new_password,
        "message":      "Temporary password reset. Share it securely with the issuer.",
    }


#  Verification Logs ─

@router.get("/verification-logs")
def get_verification_logs(
    result_filter: str | None = None,
    serial_number: str | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = db.query(VerificationLog)
    if result_filter:
        query = query.filter(VerificationLog.verification_result == result_filter.upper())
    if serial_number:
        query = query.filter(VerificationLog.serial_number.ilike(f"%{serial_number}%"))

    total = query.count()
    logs = query.order_by(VerificationLog.timestamp.desc()).offset(offset).limit(limit).all()

    return {
        "total":  total,
        "offset": offset,
        "logs": [
            {
                "id":                  log.id,
                "serial_number":       log.serial_number,
                "fullname":            log.fullname,
                "result":              log.verification_result,
                "ip_address":          log.ip_address,
                "timestamp":           log.timestamp.isoformat(),
            }
            for log in logs
        ],
    }


#  Certificate Management 

@router.post("/certificates/search")
def admin_search_certificates(
    search: CertificateSearchRequest,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return search_certificates(db=db, search=search, requesting_user=admin, limit=limit, offset=offset)


@router.get("/certificates/{certificate_id}/status")
def admin_get_cert_status(
    certificate_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return get_certificate_status_detail(db=db, certificate_id=certificate_id, requesting_user=admin)


@router.patch("/certificates/{certificate_id}/status")
def admin_change_cert_status(
    certificate_id: int,
    payload: StatusChangeRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return change_certificate_status(db=db, certificate_id=certificate_id, payload=payload, requesting_user=admin)


@router.get("/universities/{university_id}/audit-history")
def admin_audit_history(
    university_id: int,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return get_status_history_for_university(db=db, university_id=university_id, requesting_user=admin, limit=limit, offset=offset)

@router.get(
    "/activity",
    summary="Recent system activity for the admin operations view",
)
def get_recent_activity(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Returns four operational feeds:
    1. Recent certificate status changes (revocations, suspensions, reinstatements)
    2. Recent anomalous verification attempts (TAMPERED, BATCH_TAMPER, UNTRUSTED)
    3. Universities pending trust approval
    4. Issuer accounts awaiting first login (still on temp password)
    """

    #  Recent status changes 
    status_changes_raw = (
        db.query(CertificateStatusHistory, CertificateRecord, User)
        .join(CertificateRecord,
              CertificateStatusHistory.certificate_id == CertificateRecord.id)
        .join(User, CertificateStatusHistory.changed_by == User.id)
        .order_by(CertificateStatusHistory.changed_at.desc())
        .limit(10)
        .all()
    )
    status_changes = [
        {
            "serial_number":  cert.serial_number,
            "fullname":       cert.fullname,
            "issuer":         cert.issuer,
            "old_status":     hist.old_status,
            "new_status":     hist.new_status,
            "changed_by":     changer.email,
            "reason":         hist.reason,
            "changed_at":     hist.changed_at.isoformat(),
        }
        for hist, cert, changer in status_changes_raw
    ]

    #  Anomalous verifications 
    anomaly_types = [
        "TAMPERED",
        "BATCH_TAMPER_DETECTED",
        "UNTRUSTED_ISSUER",
    ]
    anomalies_raw = (
        db.query(VerificationLog)
        .filter(VerificationLog.verification_result.in_(anomaly_types))
        .order_by(VerificationLog.timestamp.desc())
        .limit(10)
        .all()
    )
    anomalies = [
        {
            "serial_number": log.serial_number,
            "fullname":      log.fullname,
            "result":        log.verification_result,
            "ip_address":    log.ip_address,
            "timestamp":     log.timestamp.isoformat(),
        }
        for log in anomalies_raw
    ]

    #  Pending university approvals 
    pending_unis = (
        db.query(University)
        .filter(University.trust_status == TrustStatus.PENDING)
        .order_by(University.created_at.desc())
        .all()
    )
    pending_approvals = [
        {
            "id":              u.id,
            "university_code": u.university_code,
            "university_name": u.university_name,
            "location":        u.location,
            "registered_on":   u.created_at.isoformat(),
        }
        for u in pending_unis
    ]

    #  Issuers awaiting first login 
    pending_issuers_raw = (
        db.query(User)
        .filter(User.role == UserRole.ISSUER, User.is_temp_password == True)
        .order_by(User.created_at.desc())
        .all()
    )
    # Enrich with university name
    uni_map = {u.id: u.university_name
               for u in db.query(University).all()}

    pending_issuers = [
        {
            "id":              u.id,
            "email":           u.email,
            "issuer_name":     u.issuer_name,
            "department":      u.department,
            "university_name": uni_map.get(u.university_id, "Unknown"),
            "created_at":      u.created_at.isoformat(),
        }
        for u in pending_issuers_raw
    ]

    return {
        "status_changes":    status_changes,
        "anomalies":         anomalies,
        "pending_approvals": pending_approvals,
        "pending_issuers":   pending_issuers,
    }


@router.get(
    "/issuers/{user_id}",
    summary="Get full detail for a single issuer account",
)
def get_issuer_detail(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Returns full profile for a single issuer including upload stats."""
    from backend.models.batch import CertificateBatch
    from backend.models.certificate import CertificateRecord
    from backend.models.university import University

    issuer = db.query(User).filter(
        User.id == user_id,
        User.role == UserRole.ISSUER,
    ).first()

    if not issuer:
        raise HTTPException(status_code=404, detail="Issuer not found.")

    uni = None
    if issuer.university_id:
        uni = db.query(University).filter(
            University.id == issuer.university_id
        ).first()

    # Upload stats scoped to this issuer's own uploads
    total_batches = db.query(CertificateBatch).filter(
        CertificateBatch.uploaded_by == issuer.id
    ).count()

    total_certs = db.query(CertificateRecord).join(
        CertificateBatch,
        CertificateRecord.batch_id == CertificateBatch.id
    ).filter(
        CertificateBatch.uploaded_by == issuer.id
    ).count()

    # Most recent batch
    last_batch = db.query(CertificateBatch).filter(
        CertificateBatch.uploaded_by == issuer.id
    ).order_by(CertificateBatch.created_at.desc()).first()

    return {
        "id":               issuer.id,
        "email":            issuer.email,
        "issuer_name":      issuer.issuer_name,
        "department":       issuer.department,
        "department_code":  issuer.department_code,
        "is_temp_password": issuer.is_temp_password,
        "last_login":       issuer.last_login.isoformat()
                            if issuer.last_login else None,
        "created_at":       issuer.created_at.isoformat(),
        "university": {
            "id":              uni.id            if uni else None,
            "university_name": uni.university_name if uni else None,
            "university_code": uni.university_code if uni else None,
            "location":        uni.location       if uni else None,
            "trust_status":    uni.trust_status   if uni else None,
        } if uni else None,
        "stats": {
            "total_batches":    total_batches,
            "total_certs":      total_certs,
            "last_batch_name":  last_batch.batch_name
                                if last_batch else None,
            "last_batch_date":  last_batch.created_at.isoformat()
                                if last_batch else None,
        },
    }
