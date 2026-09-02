"""Endpoint routes, including per-endpoint stats, charts, and logs."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Body, Query, Response, status

from app.api.deps import SessionDep
from app.schemas.analytics import StatusCodeCount, TimeRange, TimeSeriesPoint
from app.schemas.endpoint import (
    EndpointCreate,
    EndpointRead,
    EndpointStats,
    EndpointUpdate,
    EndpointWithStats,
)
from app.schemas.log import LogListItem
from app.services import analytics_service, endpoint_service, log_service

router = APIRouter(prefix="/projects/{project_id}/endpoints", tags=["endpoints"])


@router.get("", response_model=list[EndpointRead], summary="List a project's endpoints")
async def list_endpoints(
    project_id: uuid.UUID,
    session: SessionDep,
    enabled_only: bool = Query(False, description="Only return enabled endpoints"),
) -> list[EndpointRead]:
    endpoints = await endpoint_service.list_endpoints(
        session, project_id, enabled_only=enabled_only
    )
    return [EndpointRead.model_validate(e) for e in endpoints]


@router.post(
    "",
    response_model=EndpointRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register an endpoint",
)
async def create_endpoint(
    project_id: uuid.UUID, payload: EndpointCreate, session: SessionDep
) -> EndpointRead:
    endpoint = await endpoint_service.create_endpoint(session, project_id, payload)
    return EndpointRead.model_validate(endpoint)


@router.get(
    "/{endpoint_id}",
    response_model=EndpointWithStats,
    summary="Get an endpoint with its statistics",
)
async def get_endpoint(
    project_id: uuid.UUID, endpoint_id: uuid.UUID, session: SessionDep
) -> EndpointWithStats:
    endpoint = await endpoint_service.get_endpoint(session, project_id, endpoint_id)
    stats = await endpoint_service.get_endpoint_stats(session, endpoint_id)
    return EndpointWithStats(
        **EndpointRead.model_validate(endpoint).model_dump(), stats=stats
    )


@router.put("/{endpoint_id}", response_model=EndpointRead, summary="Update an endpoint")
async def update_endpoint(
    project_id: uuid.UUID,
    endpoint_id: uuid.UUID,
    payload: EndpointUpdate,
    session: SessionDep,
) -> EndpointRead:
    endpoint = await endpoint_service.update_endpoint(
        session, project_id, endpoint_id, payload
    )
    return EndpointRead.model_validate(endpoint)


@router.patch(
    "/{endpoint_id}/enabled",
    response_model=EndpointRead,
    summary="Enable or disable an endpoint",
)
async def set_endpoint_enabled(
    project_id: uuid.UUID,
    endpoint_id: uuid.UUID,
    session: SessionDep,
    enabled: bool = Body(embed=True),
) -> EndpointRead:
    endpoint = await endpoint_service.set_enabled(
        session, project_id, endpoint_id, enabled
    )
    return EndpointRead.model_validate(endpoint)


@router.delete(
    "/{endpoint_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete an endpoint (its logs are kept)",
)
async def delete_endpoint(
    project_id: uuid.UUID, endpoint_id: uuid.UUID, session: SessionDep
) -> Response:
    await endpoint_service.delete_endpoint(session, project_id, endpoint_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{endpoint_id}/stats",
    response_model=EndpointStats,
    summary="Aggregated statistics for one endpoint",
)
async def get_endpoint_stats(
    project_id: uuid.UUID, endpoint_id: uuid.UUID, session: SessionDep
) -> EndpointStats:
    await endpoint_service.get_endpoint(session, project_id, endpoint_id)
    return await endpoint_service.get_endpoint_stats(session, endpoint_id)


@router.get(
    "/{endpoint_id}/time-series",
    response_model=list[TimeSeriesPoint],
    summary="Request volume and latency over time for one endpoint",
)
async def get_endpoint_time_series(
    project_id: uuid.UUID,
    endpoint_id: uuid.UUID,
    session: SessionDep,
    time_range: TimeRange = Query(TimeRange.LAST_24_HOURS, alias="range"),
) -> list[TimeSeriesPoint]:
    await endpoint_service.get_endpoint(session, project_id, endpoint_id)
    return await analytics_service.get_endpoint_time_series(
        session, project_id, endpoint_id, time_range
    )


@router.get(
    "/{endpoint_id}/status-distribution",
    response_model=list[StatusCodeCount],
    summary="Status code distribution for one endpoint",
)
async def get_endpoint_status_distribution(
    project_id: uuid.UUID, endpoint_id: uuid.UUID, session: SessionDep
) -> list[StatusCodeCount]:
    await endpoint_service.get_endpoint(session, project_id, endpoint_id)
    return await analytics_service.get_endpoint_status_distribution(
        session, project_id, endpoint_id
    )


@router.get(
    "/{endpoint_id}/logs",
    response_model=list[LogListItem],
    summary="Recent requests for one endpoint",
)
async def get_endpoint_logs(
    project_id: uuid.UUID,
    endpoint_id: uuid.UUID,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
) -> list[LogListItem]:
    await endpoint_service.get_endpoint(session, project_id, endpoint_id)
    return await log_service.list_endpoint_logs(session, project_id, endpoint_id, limit)
