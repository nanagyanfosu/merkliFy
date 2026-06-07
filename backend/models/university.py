import enum
import random
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, Enum as SAEnum, func, event
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class TrustStatus(str, enum.Enum):
    PENDING = "PENDING"
    TRUSTED = "TRUSTED"
    REVOKED = "REVOKED"


def _generate_university_code() -> int:
    """Returns a random 5-digit integer (10000–99999)."""
    return random.randint(10000, 99999)


class University(Base):
    __tablename__ = "university_registry"

    id:               Mapped[int]       = mapped_column(primary_key=True, index=True)
    university_code:  Mapped[int]       = mapped_column(Integer, unique=True, nullable=False, index=True)
    university_name:  Mapped[str]       = mapped_column(String(255), nullable=False)
    location:         Mapped[str]       = mapped_column(String(255), nullable=False)
    contact:          Mapped[str]       = mapped_column(String(255), nullable=False)
    domain:           Mapped[str]       = mapped_column(String(255), nullable=False)

    # RSA keys — public in plaintext, private encrypted at rest
    public_key:             Mapped[str | None] = mapped_column(Text, nullable=True)
    encrypted_private_key:  Mapped[str | None] = mapped_column(Text, nullable=True)

    trust_status:     Mapped[TrustStatus] = mapped_column(
        SAEnum(TrustStatus), default=TrustStatus.PENDING, nullable=False
    )
    created_at:  Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at:  Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    users:    Mapped[list["User"]]              = relationship("User", back_populates="university")
    batches:  Mapped[list["CertificateBatch"]]  = relationship("CertificateBatch", back_populates="university")


@event.listens_for(University, "before_insert")
def assign_university_code(mapper, connection, target):
    """Auto-assign random 5-digit code before insert if not already set."""
    if target.university_code is None:
        target.university_code = _generate_university_code()