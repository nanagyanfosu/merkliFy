from datetime import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class CertificateBatch(Base):
    __tablename__ = "certificate_batches"

    id:                 Mapped[int]           = mapped_column(primary_key=True, index=True)
    university_id:      Mapped[int]           = mapped_column(ForeignKey("university_registry.id"), nullable=False)
    batch_name:         Mapped[str]           = mapped_column(String(255), nullable=False)
    academic_year:      Mapped[int]           = mapped_column(Integer, nullable=False)
    merkle_root:        Mapped[str]           = mapped_column(String(64), nullable=False)
    signed_root:        Mapped[str]           = mapped_column(Text, nullable=False)
    total_certificates: Mapped[int]           = mapped_column(Integer, nullable=False)

    # Which issuer account uploaded this batch — traceable to a specific department even when a university has multiple issuer accounts.
    uploaded_by:        Mapped[int | None]    = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at:         Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())

    university:   Mapped["University"]             = relationship("University", back_populates="batches")
    certificates: Mapped[list["CertificateRecord"]] = relationship("CertificateRecord", back_populates="batch")
    uploader:     Mapped["User | None"]             = relationship("User", foreign_keys=[uploaded_by])