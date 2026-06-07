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