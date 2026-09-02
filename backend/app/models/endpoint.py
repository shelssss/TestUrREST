"""The ``endpoints`` table -- one registered REST operation in a project."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk
from app.models.enums import HttpMethod

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.request_log import RequestLog


class Endpoint(TimestampMixin, Base):
    __tablename__ = "endpoints"
    __table_args__ = (
        # A project cannot register the same operation twice.
        UniqueConstraint("project_id", "method", "path", name="project_method_path"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    method: Mapped[HttpMethod] = mapped_column(
        SAEnum(
            HttpMethod,
            name="http_method",
            native_enum=False,
            values_callable=lambda e: [m.value for m in e],
            length=10,
        ),
        nullable=False,
    )
    path: Mapped[str] = mapped_column(String(1024), nullable=False)
    target_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    project: Mapped["Project"] = relationship(back_populates="endpoints")
    logs: Mapped[list["RequestLog"]] = relationship(back_populates="endpoint")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Endpoint {self.method} {self.path}>"
