"""Project request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import Environment
from app.schemas.common import ORMModel
from app.utils.validation import normalise_optional_base_url


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    environment: Environment = Environment.DEVELOPMENT
    base_url: str | None = Field(default=None, max_length=2048)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Project name cannot be blank")
        return cleaned

    @field_validator("base_url")
    @classmethod
    def _check_base_url(cls, value: str | None) -> str | None:
        return normalise_optional_base_url(value)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    """Every field optional -- only what is sent gets changed."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    environment: Environment | None = None
    base_url: str | None = Field(default=None, max_length=2048)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Project name cannot be blank")
        return cleaned

    @field_validator("base_url")
    @classmethod
    def _check_base_url(cls, value: str | None) -> str | None:
        return normalise_optional_base_url(value)


class ProjectRead(ORMModel):
    id: uuid.UUID
    name: str
    description: str | None
    environment: Environment
    base_url: str | None
    created_at: datetime
    updated_at: datetime


class ProjectSummary(ProjectRead):
    """A project plus the counters shown on the projects list."""

    endpoint_count: int = 0
    request_count: int = 0
