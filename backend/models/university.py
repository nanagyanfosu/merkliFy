# backend/models/university.py
import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class TrustStatus(str, enum.Enum):
    PENDING = "PENDING"
    TRUSTED = "TRUSTED"
    REVOKED = "REVOKED"


class University(Base):
    __tablename__ = "university_registry"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    university_name: Mapped[str] = mapped_column(String(255), nullable=False)
    official_email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)

    # RSA public key stored as PEM text.
    # Safe to store in plaintext — it is designed to be public.
    public_key: Mapped[str | None] = mapped_column(Text, nullable=True)

    # RSA private key stored as Fernet-encrypted bytes, then base64-encoded to text.
    # Never returned via any API response. Decrypted in-process only during signing.
    encrypted_private_key: Mapped[str | None] = mapped_column(Text, nullable=True)

    trust_status: Mapped[TrustStatus] = mapped_column(
        SAEnum(TrustStatus), default=TrustStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    users: Mapped[list["User"]] = relationship("User", back_populates="university")
    batches: Mapped[list["CertificateBatch"]] = relationship(
        "CertificateBatch", back_populates="university"
    )