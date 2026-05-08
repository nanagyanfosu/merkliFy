# backend/models/verification_log.py
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base


class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    serial_number: Mapped[str] = mapped_column(String(100), nullable=False)
    fullname: Mapped[str] = mapped_column(String(255), nullable=False)
    verification_result: Mapped[str] = mapped_column(String(50), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())