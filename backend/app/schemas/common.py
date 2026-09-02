"""Schemas shared across resources."""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    """Base for schemas serialised straight from a SQLAlchemy row."""

    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    """A single page of results plus the cursor metadata the UI needs."""

    items: list[T]
    total: int = Field(description="Total rows matching the filter, ignoring paging")
    page: int = Field(ge=1)
    limit: int = Field(ge=1)
    pages: int = Field(ge=0, description="Total number of pages available")

    @classmethod
    def build(cls, items: list[T], total: int, page: int, limit: int) -> "Page[T]":
        pages = (total + limit - 1) // limit if limit else 0
        return cls(items=items, total=total, page=page, limit=limit, pages=pages)


class ErrorResponse(BaseModel):
    """The shape every failed request returns."""

    detail: str
    errors: list["FieldError"] | None = None


class FieldError(BaseModel):
    field: str
    message: str


ErrorResponse.model_rebuild()
