"""Request-log routes: a filtered, paginated table and a detail view."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Query

from app.api.deps import SessionDep
from app.core.config import settings
from app.schemas.common import Page
from app.schemas.log import LogDetail, LogFilters, LogListItem, StatusCategory
from app.services import log_service

router = APIRouter(prefix="/projects/{project_id}/logs", tags=["logs"])


@router.get(
    "",
    response_model=Page[LogListItem],
    summary="List request logs with filters and pagination",
)
async def list_logs(
    project_id: uuid.UUID,
    session: SessionDep,
    page: int = Query(1, ge=1),
    limit: int = Query(settings.default_log_page_size, ge=1, le=settings.max_log_page_size),
    method: str | None = Query(None, description="Filter by HTTP method"),
    status_code: int | None = Query(None, ge=100, le=599),
    status_category: StatusCategory = Query(
        StatusCategory.ALL, description="all, 2xx, 3xx, 4xx, 5xx, or failed"
    ),
    endpoint_id: uuid.UUID | None = Query(None),
    search: str | None = Query(None, max_length=200, description="Match URL or request id"),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    min_response_time_ms: int | None = Query(None, ge=0),
    max_response_time_ms: int | None = Query(None, ge=0),
) -> Page[LogListItem]:
    filters = LogFilters(
        page=page,
        limit=limit,
        method=method,
        status_code=status_code,
        status_category=status_category,
        endpoint_id=endpoint_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        min_response_time_ms=min_response_time_ms,
        max_response_time_ms=max_response_time_ms,
    )
    return await log_service.list_logs(session, project_id, filters)


@router.get(
    "/recent",
    response_model=list[LogListItem],
    summary="The newest requests in a project",
)
async def list_recent_logs(
    project_id: uuid.UUID,
    session: SessionDep,
    limit: int = Query(10, ge=1, le=50),
) -> list[LogListItem]:
    return await log_service.list_recent_logs(session, project_id, limit)


@router.get(
    "/{request_id}",
    response_model=LogDetail,
    summary="Full request and response detail for one log",
)
async def get_log(
    project_id: uuid.UUID, request_id: str, session: SessionDep
) -> LogDetail:
    return await log_service.get_log(session, project_id, request_id)
