"""Endpoint request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import HttpMethod
from app.schemas.common import ORMModel
from app.utils.validation import normalise_target_url


def _normalise_path(value: str) -> str:
    """Endpoint paths are stored with exactly one leading slash."""
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Path is required")
    if not cleaned.startswith("/"):
        cleaned = f"/{cleaned}"
    return cleaned


class EndpointBase(BaseModel):
    method: HttpMethod
    path: str = Field(min_length=1, max_length=1024, examples=["/orders"])
    target_url: str = Field(
        min_length=1,
        max_length=2048,
        examples=["https://api.example.com/orders"],
    )
    description: str | None = Field(default=None, max_length=2000)
    enabled: bool = True

    @field_validator("path")
    @classmethod
    def _path(cls, value: str) -> str:
        return _normalise_path(value)

    @field_validator("target_url")
    @classmethod
    def _target(cls, value: str) -> str:
        return normalise_target_url(value)


class EndpointCreate(EndpointBase):
    pass


class EndpointUpdate(BaseModel):
    method: HttpMethod | None = None
    path: str | None = Field(default=None, min_length=1, max_length=1024)
    target_url: str | None = Field(default=None, min_length=1, max_length=2048)
    description: str | None = Field(default=None, max_length=2000)
    enabled: bool | None = None

    @field_validator("path")
    @classmethod
    def _path(cls, value: str | None) -> str | None:
        return None if value is None else _normalise_path(value)

    @field_validator("target_url")
    @classmethod
    def _target(cls, value: str | None) -> str | None:
        return None if value is None else normalise_target_url(value)


class EndpointRead(ORMModel):
    id: uuid.UUID
    project_id: uuid.UUID
    method: HttpMethod
    path: str
    target_url: str
    description: str | None
    enabled: bool
    created_at: datetime
    updated_at: datetime


class EndpointStats(BaseModel):
    """Aggregates for one endpoint's detail page."""

    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    success_rate: float = 0.0
    error_rate: float = 0.0
    avg_response_time_ms: float = 0.0
    min_response_time_ms: int = 0
    max_response_time_ms: int = 0
    last_request_at: datetime | None = None


class EndpointWithStats(EndpointRead):
    stats: EndpointStats
