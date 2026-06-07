import enum
import secrets
import string
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum, ForeignKey, func, event
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class UserRole(str, enum.Enum):
    ADMIN  = "ADMIN"
    ISSUER = "ISSUER"


def _make_dept_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "ISS-" + "".join(secrets.choice(chars) for _ in range(4))


class User(Base):
    __tablename__ = "users"

    id:               Mapped[int]           = mapped_column(primary_key=True, index=True)
    email:            Mapped[str]           = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash:    Mapped[str]           = mapped_column(String(255), nullable=False)
    role:             Mapped[UserRole]      = mapped_column(SAEnum(UserRole), nullable=False)
    university_id:    Mapped[int | None]    = mapped_column(ForeignKey("university_registry.id"), nullable=True)
    issuer_name:      Mapped[str | None]    = mapped_column(String(255), nullable=True)
    department:       Mapped[str | None]    = mapped_column(String(255), nullable=True)
    department_code:  Mapped[str | None]    = mapped_column(String(20), nullable=True, unique=True)
    is_temp_password: Mapped[bool]          = mapped_column(Boolean, default=True, nullable=False)


    last_login:       Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at:       Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())

    university: Mapped["University | None"] = relationship("University", back_populates="users")


@event.listens_for(User, "before_insert")
def assign_dept_code(mapper, connection, target):
    if target.role == UserRole.ISSUER and not target.department_code:
        target.department_code = _make_dept_code()