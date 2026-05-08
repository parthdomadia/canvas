import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Edge(Base):
    __tablename__ = "edges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    canvas_id: Mapped[str] = mapped_column(String, ForeignKey("canvases.id", ondelete="CASCADE"), nullable=False)
    source_id: Mapped[str] = mapped_column(String, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[str] = mapped_column(String, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str | None] = mapped_column(Text, nullable=True)
    style: Mapped[str] = mapped_column(String(50), nullable=False, default="solid")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("source_id != target_id", name="no_self_loop"),
    )
