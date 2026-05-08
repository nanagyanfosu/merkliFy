# backend/models/user.py
import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base
from backend.models.university import University
    

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    ISSUER = "ISSUER"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)

    # NULL for admin users
    university_id: Mapped[int | None] = mapped_column(
        ForeignKey("university_registry.id"), nullable=True
    )

    # Forces password change on first login
    is_temp_password: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    university: Mapped["University | None"] = relationship(
        "University", back_populates="users"
    )