"""Endpoint CRUD and per-endpoint statistics."""

from __future__ import annotations

import uuid

from sqlalchemy import Float, case, cast, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, EndpointNotFoundError
from app.models import Endpoint, RequestLog
from app.schemas.endpoint import EndpointCreate, EndpointStats, EndpointUpdate
from app.services.project_service import get_project

#: A request counts as successful on any 2xx or 3xx response.
_IS_SUCCESS = RequestLog.status_code.between(200, 399)


async def list_endpoints(
    session: AsyncSession,
    project_id: uuid.UUID,
    *,
    enabled_only: bool = False,
) -> list[Endpoint]:
    await get_project(session, project_id)  # 404s on an unknown project
    query = select(Endpoint).where(Endpoint.project_id == project_id)
    if enabled_only:
        query = query.where(Endpoint.enabled.is_(True))
    result = await session.execute(query.order_by(Endpoint.path.asc(), Endpoint.method.asc()))
    return list(result.scalars().all())


async def get_endpoint(
    session: AsyncSession, project_id: uuid.UUID, endpoint_id: uuid.UUID
) -> Endpoint:
    """Fetch an endpoint, scoped to its project.

    Scoping by ``project_id`` is what keeps projects isolated: an id from
    one project can never be read through another project's URL.
    """
    result = await session.execute(
        select(Endpoint).where(
            Endpoint.id == endpoint_id, Endpoint.project_id == project_id
        )
    )
    endpoint = result.scalar_one_or_none()
    if endpoint is None:
        raise EndpointNotFoundError()
    return endpoint


async def create_endpoint(
    session: AsyncSession, project_id: uuid.UUID, data: EndpointCreate
) -> Endpoint:
    await get_project(session, project_id)
    endpoint = Endpoint(project_id=project_id, **data.model_dump())
    session.add(endpoint)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ConflictError(
            f"{data.method} {data.path} is already registered in this project"
        ) from exc
    await session.refresh(endpoint)
    return endpoint


async def update_endpoint(
    session: AsyncSession,
    project_id: uuid.UUID,
    endpoint_id: uuid.UUID,
    data: EndpointUpdate,
) -> Endpoint:
    endpoint = await get_endpoint(session, project_id, endpoint_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(endpoint, field, value)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ConflictError(
            "Another endpoint in this project already uses that method and path"
        ) from exc
    await session.refresh(endpoint)
    return endpoint


async def delete_endpoint(
    session: AsyncSession, project_id: uuid.UUID, endpoint_id: uuid.UUID
) -> None:
    """Delete an endpoint. Its logs survive with a null ``endpoint_id``."""
    endpoint = await get_endpoint(session, project_id, endpoint_id)
    await session.delete(endpoint)
    await session.commit()


async def set_enabled(
    session: AsyncSession,
    project_id: uuid.UUID,
    endpoint_id: uuid.UUID,
    enabled: bool,
) -> Endpoint:
    endpoint = await get_endpoint(session, project_id, endpoint_id)
    endpoint.enabled = enabled
    await session.commit()
    await session.refresh(endpoint)
    return endpoint


async def get_endpoint_stats(
    session: AsyncSession, endpoint_id: uuid.UUID
) -> EndpointStats:
    """Aggregate one endpoint's traffic in a single query."""
    success_count = func.count(case((_IS_SUCCESS, 1)))
    result = await session.execute(
        select(
            func.count(RequestLog.id),
            success_count,
            func.avg(cast(RequestLog.response_time_ms, Float)),
            func.min(RequestLog.response_time_ms),
            func.max(RequestLog.response_time_ms),
            func.max(RequestLog.created_at),
        ).where(RequestLog.endpoint_id == endpoint_id)
    )
    total, successful, avg_ms, min_ms, max_ms, last_at = result.one()

    total = total or 0
    successful = successful or 0
    failed = total - successful
    return EndpointStats(
        total_requests=total,
        successful_requests=successful,
        failed_requests=failed,
        success_rate=round(successful / total * 100, 2) if total else 0.0,
        error_rate=round(failed / total * 100, 2) if total else 0.0,
        avg_response_time_ms=round(float(avg_ms), 2) if avg_ms is not None else 0.0,
        min_response_time_ms=int(min_ms) if min_ms is not None else 0,
        max_response_time_ms=int(max_ms) if max_ms is not None else 0,
        last_request_at=last_at,
    )
