from datetime import datetime
from sqlalchemy import Integer, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class MerkleProof(Base):
    __tablename__ = "merkle_proofs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    certificate_id: Mapped[int] = mapped_column(
        ForeignKey("certificate_records.id"), nullable=False, unique=True
    )

    # sibling path from leaf to root.
    proof_path: Mapped[list] = mapped_column(JSON, nullable=False)

    leaf_index: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    certificate: Mapped["CertificateRecord"] = relationship(
        "CertificateRecord", back_populates="merkle_proof"
    )