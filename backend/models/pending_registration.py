"""
Stores institution pre-registration requests submitted via the
public landing page form. Admin reviews and converts to full
university records with one click.
"""
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base


class PendingRegistration(Base):
    __tablename__ = "pending_registrations"

    id:                 Mapped[int]       = mapped_column(primary_key=True)
    university_name:    Mapped[str]       = mapped_column(String(255), nullable=False)
    institution_type:   Mapped[str]       = mapped_column(String(100), nullable=False)
    location:           Mapped[str]       = mapped_column(String(255), nullable=False)
    official_email:     Mapped[str]       = mapped_column(String(255), nullable=False)
    phone:              Mapped[str | None]= mapped_column(String(60), nullable=True)
    website_url:        Mapped[str | None]= mapped_column(String(255), nullable=True)
    domain:             Mapped[str]       = mapped_column(String(255), nullable=False)
    year_established:   Mapped[int | None]= mapped_column(Integer, nullable=True)
    student_population: Mapped[int | None]= mapped_column(Integer, nullable=True)
    contact_name:       Mapped[str]       = mapped_column(String(255), nullable=False)
    contact_role:       Mapped[str]       = mapped_column(String(255), nullable=False)
    notes:              Mapped[str | None]= mapped_column(Text, nullable=True)
    status:             Mapped[str]       = mapped_column(
        String(20), default="PENDING", nullable=False
    )  # PENDING / APPROVED / REJECTED
    submitted_at:       Mapped[datetime]  = mapped_column(DateTime, server_default=func.now())
    reviewed_at:        Mapped[datetime | None] = mapped_column(DateTime, nullable=True)