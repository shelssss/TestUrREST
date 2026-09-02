"""The ``projects`` table -- an isolated API environment."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, uuid_pk
from app.models.enums import Environment

if TYPE_CHECKING:
    from app.models.endpoint import Endpoint
    from app.models.request_log import RequestLog


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    environment: Mapped[Environment] = mapped_column(
        SAEnum(
            Environment,
            name="environment",
            native_enum=False,
            values_callable=lambda e: [m.value for m in e],
            length=20,
        ),
        nullable=False,
        default=Environment.DEVELOPMENT,
    )
    base_url: Mapped[str | None] = mapped_column(String(2048))

    endpoints: Mapped[list["Endpoint"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    logs: Mapped[list["RequestLog"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Project {self.name!r} ({self.environment})>"
