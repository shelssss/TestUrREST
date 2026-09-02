"""Request-log schemas: list rows, detail view, and filters."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class StatusCategory(StrEnum):
    """The coarse status buckets offered as log filters."""

    ALL = "all"
    SUCCESS_2XX = "2xx"
    REDIRECT_3XX = "3xx"
    CLIENT_ERROR_4XX = "4xx"
    SERVER_ERROR_5XX = "5xx"
    FAILED = "failed"  # no response at all: timeout / connection error


class LogListItem(ORMModel):
    """The trimmed row rendered in the logs table.

    Bodies and headers are deliberately excluded -- the table shows hundreds
    of rows and never needs them. They are fetched with the detail view.
    """

    id: uuid.UUID
    request_id: str
    project_id: uuid.UUID
    endpoint_id: uuid.UUID | None
    method: str
    url: str
    status_code: int | None
    response_time_ms: int
    response_size: int
    error_message: str | None
    created_at: datetime


class LogDetail(LogListItem):
    """The full record, including everything captured for the request."""

    request_headers: dict[str, str]
    query_parameters: dict[str, str]
    request_body: str | None
    response_headers: dict[str, str] | None
    response_body: str | None
    client_ip: str | None
    user_agent: str | None
    #: Path of the endpoint this log belongs to, if it still exists.
    endpoint_path: str | None = None


class LogFilters(BaseModel):
    """Query parameters accepted by the logs list endpoint."""

    page: int = Field(default=1, ge=1)
    limit: int = Field(default=50, ge=1, le=200)
    method: str | None = None
    status_code: int | None = Field(default=None, ge=100, le=599)
    status_category: StatusCategory = StatusCategory.ALL
    endpoint_id: uuid.UUID | None = None
    search: str | None = Field(default=None, max_length=200)
    start_date: datetime | None = None
    end_date: datetime | None = None
    min_response_time_ms: int | None = Field(default=None, ge=0)
    max_response_time_ms: int | None = Field(default=None, ge=0)
