import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Enum as SAEnum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class CertificateLifecycleStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"
    SUSPENDED = "SUSPENDED"


class CertificateStatus(Base):
    __tablename__ = "certificate_status"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    certificate_id: Mapped[int] = mapped_column(
        ForeignKey("certificate_records.id"), nullable=False, unique=True
    )
    current_status: Mapped[CertificateLifecycleStatus] = mapped_column(
        SAEnum(CertificateLifecycleStatus), default=CertificateLifecycleStatus.ACTIVE
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    certificate: Mapped["CertificateRecord"] = relationship(
        "CertificateRecord", back_populates="status"
    )


class CertificateStatusHistory(Base):
    # Full audit trail of every status change.
    __tablename__ = "certificate_status_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    certificate_id: Mapped[int] = mapped_column(
        ForeignKey("certificate_records.id"), nullable=False
    )
    old_status: Mapped[str] = mapped_column(String(20), nullable=False)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    certificate: Mapped["CertificateRecord"] = relationship(
        "CertificateRecord", back_populates="status_history"
    )