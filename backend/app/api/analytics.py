"""Analytics routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Query

from app.api.deps import SessionDep
from app.schemas.analytics import AnalyticsResponse, TimeRange
from app.services import analytics_service

router = APIRouter(prefix="/projects/{project_id}/analytics", tags=["analytics"])


@router.get(
    "",
    response_model=AnalyticsResponse,
    summary="Aggregated analytics for a project over a time range",
)
async def get_analytics(
    project_id: uuid.UUID,
    session: SessionDep,
    time_range: TimeRange = Query(
        TimeRange.LAST_24_HOURS,
        alias="range",
        description="1h, 24h, 7d, or 30d",
    ),
) -> AnalyticsResponse:
    return await analytics_service.get_analytics(session, project_id, time_range)
