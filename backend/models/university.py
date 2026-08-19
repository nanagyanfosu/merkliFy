import enum
import random
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, Enum as SAEnum, func, event
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class TrustStatus(str, enum.Enum):
    PENDING = "PENDING"
    TRUSTED = "TRUSTED"
    REVOKED = "REVOKED"


class InstitutionType(str, enum.Enum):
    UNIVERSITY       = "University"
    POLYTECHNIC      = "Polytechnic"
    COLLEGE          = "College"
    PROFESSIONAL     = "Professional Institution"
    VOCATIONAL       = "Vocational Institute"
    OTHER            = "Other"


class University(Base):
    __tablename__ = "university_registry"

    id:               Mapped[int]    = mapped_column(primary_key=True, index=True)
    university_code:  Mapped[int]    = mapped_column(Integer, unique=True, nullable=False)
    university_name:  Mapped[str]    = mapped_column(String(255), nullable=False)
    institution_type: Mapped[InstitutionType] = mapped_column(
        SAEnum(InstitutionType),
        default=InstitutionType.UNIVERSITY,
        nullable=False,
    )
    location:         Mapped[str]    = mapped_column(String(255), nullable=False)
    official_email:   Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone:            Mapped[str | None] = mapped_column(String(60), nullable=True)
    website_url:      Mapped[str | None] = mapped_column(String(255), nullable=True)
    domain:           Mapped[str]    = mapped_column(String(255), nullable=False)
    year_established: Mapped[int | None] = mapped_column(Integer, nullable=True)
    student_population: Mapped[int | None] = mapped_column(Integer, nullable=True)

    public_key:            Mapped[str | None] = mapped_column(Text, nullable=True)
    encrypted_private_key: Mapped[str | None] = mapped_column(Text, nullable=True)

    trust_status: Mapped[TrustStatus] = mapped_column(
        SAEnum(TrustStatus), default=TrustStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    users:   Mapped[list["User"]]             = relationship("User", back_populates="university")
    batches: Mapped[list["CertificateBatch"]] = relationship("CertificateBatch", back_populates="university")


@event.listens_for(University, "before_insert")
def assign_university_code(mapper, connection, target):
    if not target.university_code:
        target.university_code = random.randint(10000, 99999)