from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class CertificateRecord(Base):
    __tablename__ = "certificate_records"
    __table_args__ = (
        UniqueConstraint("serial_number", "university_id", name="uq_serial_university"),
    )

    id:              Mapped[int] = mapped_column(primary_key=True, index=True)
    batch_id:        Mapped[int] = mapped_column(ForeignKey("certificate_batches.id"), nullable=False)

    university_id:   Mapped[int] = mapped_column(ForeignKey("university_registry.id"), nullable=False, index=True)

    serial_number:   Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    fullname:        Mapped[str] = mapped_column(String(255), nullable=False)
    program:         Mapped[str] = mapped_column(String(255), nullable=False)
    graduation_year: Mapped[int] = mapped_column(Integer, nullable=False)
    issuer:          Mapped[str] = mapped_column(String(255), nullable=False)

    # Optional metadata
    student_id:      Mapped[str | None] = mapped_column(String(100), nullable=True)
    classification:  Mapped[str | None] = mapped_column(String(100), nullable=True)
    issue_date:      Mapped[str | None] = mapped_column(String(20), nullable=True)

    certificate_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at:       Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    batch:        Mapped["CertificateBatch"]             = relationship("CertificateBatch", back_populates="certificates")
    merkle_proof: Mapped["MerkleProof | None"]           = relationship("MerkleProof", back_populates="certificate", uselist=False)
    status:       Mapped["CertificateStatus | None"]     = relationship("CertificateStatus", back_populates="certificate", uselist=False)
    status_history: Mapped[list["CertificateStatusHistory"]] = relationship("CertificateStatusHistory", back_populates="certificate")