from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    batch_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    batch_name: Mapped[str] = mapped_column(String(255), nullable=False)
    certificate_count: Mapped[int] = mapped_column(Integer, nullable=False)
    university_id: Mapped[int | None] = mapped_column(
        ForeignKey("university_registry.id"), nullable=True
    )
    university_name: Mapped[str] = mapped_column(String(255), nullable=False)
    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
