"""The ``request_logs`` table -- one record per proxied request."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, JSONColumn, UTCDateTime, uuid_pk

if TYPE_CHECKING:
    from app.models.endpoint import Endpoint
    from app.models.project import Project


class RequestLog(Base):
    """An immutable record of a request/response pair.

    Logs outlive the endpoint that produced them: deleting an endpoint nulls
    ``endpoint_id`` rather than destroying the history, so analytics for a
    project stay accurate.
    """

    __tablename__ = "request_logs"
    __table_args__ = (
        # The log table's primary read pattern: newest-first within a project.
        Index("ix_request_logs_project_id_created_at", "project_id", "created_at"),
        # Status filtering ("show me the 5xx for this project") is next.
        Index("ix_request_logs_project_id_status_code", "project_id", "status_code"),
        # Endpoint detail pages page through one endpoint's history.
        Index("ix_request_logs_endpoint_id_created_at", "endpoint_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()

    #: Human-facing correlation id, e.g. ``req_8f32a91c4b0d``.
    request_id: Mapped[str] = mapped_column(
        String(32), nullable=False, unique=True, index=True
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    endpoint_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("endpoints.id", ondelete="SET NULL"), index=True
    )

    method: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)

    request_headers: Mapped[dict[str, str]] = mapped_column(
        JSONColumn, nullable=False, default=dict
    )
    query_parameters: Mapped[dict[str, str]] = mapped_column(
        JSONColumn, nullable=False, default=dict
    )
    request_body: Mapped[str | None] = mapped_column(Text)

    #: NULL when the target never answered (timeout / connection failure).
    status_code: Mapped[int | None] = mapped_column(Integer, index=True)
    response_headers: Mapped[dict[str, str] | None] = mapped_column(JSONColumn)
    response_body: Mapped[str | None] = mapped_column(Text)

    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    response_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    #: Populated when the request failed before a response existed.
    error_message: Mapped[str | None] = mapped_column(Text)

    client_ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(512))

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, server_default=func.now(), index=True
    )

    project: Mapped["Project"] = relationship(back_populates="logs")
    endpoint: Mapped["Endpoint | None"] = relationship(back_populates="logs")

    @property
    def is_success(self) -> bool:
        """A request counts as successful only on a 2xx or 3xx response."""
        return self.status_code is not None and 200 <= self.status_code < 400

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<RequestLog {self.request_id} {self.method} {self.status_code}>"

