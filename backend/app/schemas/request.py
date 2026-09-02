"""Schemas for the API Explorer: sending a request and reading the result."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.enums import HttpMethod


class ProxyRequest(BaseModel):
    """What the API Explorer sends to the backend.

    Either ``url`` or ``endpoint_id`` must be supplied. When an endpoint is
    named, its target URL is used and the request is attributed to it in the
    logs; an explicit ``url`` overrides the endpoint's own target while still
    keeping the attribution.
    """

    method: HttpMethod
    url: str | None = Field(default=None, max_length=2048)
    endpoint_id: uuid.UUID | None = None
    query_parameters: dict[str, str] = Field(default_factory=dict)
    headers: dict[str, str] = Field(default_factory=dict)
    body: str | None = Field(default=None, max_length=1_000_000)
    timeout_seconds: float | None = Field(default=None, gt=0, le=120)

    @model_validator(mode="after")
    def _need_a_destination(self) -> "ProxyRequest":
        if not (self.url and self.url.strip()) and self.endpoint_id is None:
            raise ValueError("Provide either a URL or an endpoint to send the request to")
        return self


class ProxyResponse(BaseModel):
    """The result of a proxied call, as shown in the Response Viewer.

    ``status_code`` is ``None`` when the target never answered; ``error``
    then carries a human-readable reason. The request is logged either way.
    """

    request_id: str
    log_id: uuid.UUID
    endpoint_id: uuid.UUID | None = None

    method: HttpMethod
    url: str

    status_code: int | None = None
    status_text: str | None = None
    response_time_ms: int
    response_size: int

    headers: dict[str, str] = Field(default_factory=dict)
    body: str | None = None
    #: True when the response parsed as JSON, so the UI can pick a viewer.
    is_json: bool = False
    #: True when the stored body was cut short by the logging size cap.
    body_truncated: bool = False

    error: str | None = None
    created_at: datetime
