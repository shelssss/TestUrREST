"""Project CRUD. Routes call these; they never touch the ORM directly."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, ProjectNotFoundError
from app.models import Endpoint, Project, RequestLog
from app.schemas.project import ProjectCreate, ProjectSummary, ProjectUpdate


async def list_projects(session: AsyncSession) -> list[ProjectSummary]:
    """Every project with its endpoint and request counts.

    The counts come from correlated subqueries so the whole list is one
    round trip instead of two extra queries per project.
    """
    endpoint_count = (
        select(func.count(Endpoint.id))
        .where(Endpoint.project_id == Project.id)
        .correlate(Project)
        .scalar_subquery()
    )
    request_count = (
        select(func.count(RequestLog.id))
        .where(RequestLog.project_id == Project.id)
        .correlate(Project)
        .scalar_subquery()
    )

    result = await session.execute(
        select(Project, endpoint_count, request_count).order_by(Project.name.asc())
    )
    return [
        ProjectSummary(
            **ProjectSummary.model_validate(project).model_dump(
                exclude={"endpoint_count", "request_count"}
            ),
            endpoint_count=endpoints,
            request_count=requests,
        )
        for project, endpoints, requests in result.all()
    ]


async def get_project(session: AsyncSession, project_id: uuid.UUID) -> Project:
    """Fetch a project or raise ``ProjectNotFoundError``."""
    project = await session.get(Project, project_id)
    if project is None:
        raise ProjectNotFoundError()
    return project


async def create_project(session: AsyncSession, data: ProjectCreate) -> Project:
    project = Project(**data.model_dump())
    session.add(project)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ConflictError(f"A project named '{data.name}' already exists") from exc
    await session.refresh(project)
    return project


async def update_project(
    session: AsyncSession, project_id: uuid.UUID, data: ProjectUpdate
) -> Project:
    project = await get_project(session, project_id)
    # exclude_unset keeps PATCH-style semantics: omitted fields are untouched,
    # while an explicit null still clears a nullable column.
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ConflictError("A project with that name already exists") from exc
    await session.refresh(project)
    return project


async def delete_project(session: AsyncSession, project_id: uuid.UUID) -> None:
    """Delete a project and, by cascade, its endpoints and logs."""
    project = await get_project(session, project_id)
    await session.delete(project)
    await session.commit()
