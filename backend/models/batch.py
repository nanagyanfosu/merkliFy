# backend/models/batch.py
from datetime import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class CertificateBatch(Base):
    __tablename__ = "certificate_batches"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    university_id: Mapped[int] = mapped_column(
        ForeignKey("university_registry.id"), nullable=False
    )
    batch_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # The Merkle Root is the cryptographic fingerprint of this batch.
    # It is signed with the university's RSA private key.
    merkle_root: Mapped[str] = mapped_column(String(64), nullable=False)   # hex SHA-256
    signed_root: Mapped[str] = mapped_column(Text, nullable=False)         # base64 signature

    total_certificates: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    university: Mapped["University"] = relationship("University", back_populates="batches")
    certificates: Mapped[list["CertificateRecord"]] = relationship(
        "CertificateRecord", back_populates="batch"
    )