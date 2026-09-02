"""Aggregation queries behind the dashboard, analytics, and endpoint stats.

Every number here is computed by PostgreSQL. Raw logs are never shipped to
the browser to be counted client-side -- a project with a million requests
answers a dashboard query just as fast as one with a hundred.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import Float, Integer, and_, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Endpoint, RequestLog
from app.schemas.analytics import (
    AnalyticsResponse,
    EndpointHighlights,
    EndpointUsage,
    MethodCount,
    RequestSummary,
    StatusBreakdown,
    StatusCodeCount,
    TimeRange,
    TimeSeriesPoint,
)
from app.services.project_service import get_project

#: How far back each range reaches, and how wide its chart buckets are.
_RANGE_CONFIG: dict[TimeRange, tuple[timedelta, timedelta]] = {
    TimeRange.LAST_HOUR: (timedelta(hours=1), timedelta(minutes=5)),
    TimeRange.LAST_24_HOURS: (timedelta(days=1), timedelta(hours=1)),
    TimeRange.LAST_7_DAYS: (timedelta(days=7), timedelta(hours=6)),
    TimeRange.LAST_30_DAYS: (timedelta(days=30), timedelta(days=1)),
}

#: 2xx and 3xx count as success; 4xx, 5xx and no-response count as failure.
_IS_SUCCESS = RequestLog.status_code.between(200, 399)


def resolve_range(time_range: TimeRange) -> tuple[datetime, datetime, timedelta]:
    """Return (start, end, bucket_size) for a dashboard range."""
    window, bucket = _RANGE_CONFIG[time_range]
    end = datetime.now(timezone.utc)
    return end - window, end, bucket


def _rate(part: int, whole: int) -> float:
    return round(part / whole * 100, 2) if whole else 0.0


async def _summary(
    session: AsyncSession, project_id: uuid.UUID, start: datetime, end: datetime
) -> tuple[RequestSummary, StatusBreakdown]:
    """Totals, rates, and the status-class breakdown in one pass."""
    scope = and_(
        RequestLog.project_id == project_id,
        RequestLog.created_at >= start,
        RequestLog.created_at <= end,
    )

    def count_between(low: int, high: int):
        return func.count(case((RequestLog.status_code.between(low, high), 1)))

    row = (
        await session.execute(
            select(
                func.count(RequestLog.id),
                func.count(case((_IS_SUCCESS, 1))),
                func.avg(cast(RequestLog.response_time_ms, Float)),
                count_between(200, 299),
                count_between(300, 399),
                count_between(400, 499),
                count_between(500, 599),
                func.count(case((RequestLog.status_code.is_(None), 1))),
            ).where(scope)
        )
    ).one()

    total, successful, avg_ms, c2xx, c3xx, c4xx, c5xx, failed_no_response = row
    total = total or 0
    successful = successful or 0
    failed = total - successful

    # p95 is read separately: it needs an ordered scan rather than an
    # aggregate, and only over the response times in range.
    p95 = 0.0
    if total:
        offset = max(0, int(total * 0.95) - 1)
        p95_value = await session.scalar(
            select(RequestLog.response_time_ms)
            .where(scope)
            .order_by(RequestLog.response_time_ms.asc())
            .offset(offset)
            .limit(1)
        )
        p95 = float(p95_value or 0)

    summary = RequestSummary(
        total_requests=total,
        successful_requests=successful,
        failed_requests=failed,
        success_rate=_rate(successful, total),
        error_rate=_rate(failed, total),
        avg_response_time_ms=round(float(avg_ms), 2) if avg_ms is not None else 0.0,
        p95_response_time_ms=round(p95, 2),
    )
    breakdown = StatusBreakdown(
        success_2xx=c2xx or 0,
        redirect_3xx=c3xx or 0,
        client_error_4xx=c4xx or 0,
        server_error_5xx=c5xx or 0,
        failed=failed_no_response or 0,
    )
    return summary, breakdown


def _bucket_index(session: AsyncSession, bucket_seconds: int):
    """A SQL expression grouping rows into fixed-width time buckets.

    Bucketing happens in the database so the chart is built from grouped
    counts, not from raw rows pulled into Python. The epoch expression is
    dialect-specific, which is the one place this service has to know which
    backend it is talking to (PostgreSQL in production, SQLite under test).
    """
    dialect = session.bind.dialect.name if session.bind is not None else "postgresql"
    if dialect == "sqlite":
        epoch = func.cast(func.strftime("%s", RequestLog.created_at), Integer)
    else:
        epoch = func.extract("epoch", RequestLog.created_at)
    return func.cast(func.floor(epoch / bucket_seconds), Integer)


async def _time_series(
    session: AsyncSession,
    project_id: uuid.UUID,
    start: datetime,
    end: datetime,
    bucket: timedelta,
) -> list[TimeSeriesPoint]:
    """Request volume and latency per bucket, gap-filled across the range.

    Buckets with no traffic are returned as zeroes rather than omitted, so
    the chart shows a flat line through quiet periods instead of joining
    across them.
    """
    bucket_seconds = int(bucket.total_seconds())
    index = _bucket_index(session, bucket_seconds)

    rows = (
        await session.execute(
            select(
                index.label("bucket"),
                func.count(RequestLog.id),
                func.count(case((_IS_SUCCESS, 1))),
                func.avg(cast(RequestLog.response_time_ms, Float)),
            )
            .where(
                RequestLog.project_id == project_id,
                RequestLog.created_at >= start,
                RequestLog.created_at <= end,
            )
            .group_by(index)
        )
    ).all()

    by_bucket = {
        int(bucket_id): (total, successful, avg_ms)
        for bucket_id, total, successful, avg_ms in rows
        if bucket_id is not None
    }

    points: list[TimeSeriesPoint] = []
    first = int(start.timestamp()) // bucket_seconds
    last = int(end.timestamp()) // bucket_seconds
    for bucket_id in range(first, last + 1):
        total, successful, avg_ms = by_bucket.get(bucket_id, (0, 0, None))
        points.append(
            TimeSeriesPoint(
                timestamp=datetime.fromtimestamp(
                    bucket_id * bucket_seconds, tz=timezone.utc
                ),
                total=total or 0,
                successful=successful or 0,
                failed=(total or 0) - (successful or 0),
                avg_response_time_ms=(
                    round(float(avg_ms), 2) if avg_ms is not None else 0.0
                ),
            )
        )
    return points


async def endpoint_usage(
    session: AsyncSession, project_id: uuid.UUID, start: datetime, end: datetime
) -> list[EndpointUsage]:
    """Per-endpoint traffic, busiest first.

    Requests sent from the API Explorer without picking a registered
    endpoint are grouped under a single synthetic "ad-hoc" row so they are
    visible but never confused with a real endpoint.
    """
    rows = (
        await session.execute(
            select(
                RequestLog.endpoint_id,
                func.max(Endpoint.method),
                func.max(Endpoint.path),
                func.max(RequestLog.method),
                func.count(RequestLog.id),
                func.avg(cast(RequestLog.response_time_ms, Float)),
                func.count(case((_IS_SUCCESS, 1))),
            )
            .outerjoin(Endpoint, Endpoint.id == RequestLog.endpoint_id)
            .where(
                RequestLog.project_id == project_id,
                RequestLog.created_at >= start,
                RequestLog.created_at <= end,
            )
            .group_by(RequestLog.endpoint_id)
            .order_by(func.count(RequestLog.id).desc())
        )
    ).all()

    usage: list[EndpointUsage] = []
    for endpoint_id, method, path, log_method, count, avg_ms, successful in rows:
        count = count or 0
        successful = successful or 0
        usage.append(
            EndpointUsage(
                endpoint_id=endpoint_id,
                method=method or log_method or "GET",
                path=path or "Ad-hoc requests",
                request_count=count,
                avg_response_time_ms=(
                    round(float(avg_ms), 2) if avg_ms is not None else 0.0
                ),
                error_count=count - successful,
                success_rate=_rate(successful, count),
            )
        )
    return usage


def _highlights(
    usage: list[EndpointUsage], total_endpoints: int, enabled_endpoints: int
) -> EndpointHighlights:
    """Pick the "most X" endpoints from the usage rows already computed.

    Only endpoints with traffic are eligible, and ranking ties break toward
    the busier endpoint so a single lucky request cannot top the chart.
    """
    ranked = [u for u in usage if u.request_count > 0]
    highlights = EndpointHighlights(
        total_endpoints=total_endpoints,
        enabled_endpoints=enabled_endpoints,
    )
    if not ranked:
        return highlights

    highlights.most_used = max(ranked, key=lambda u: u.request_count)
    highlights.slowest = max(ranked, key=lambda u: u.avg_response_time_ms)
    highlights.most_successful = max(
        ranked, key=lambda u: (u.success_rate, u.request_count)
    )
    most_errors = max(ranked, key=lambda u: (u.error_count, u.request_count))
    highlights.most_errors = most_errors if most_errors.error_count > 0 else None
    return highlights


async def get_analytics(
    session: AsyncSession,
    project_id: uuid.UUID,
    time_range: TimeRange = TimeRange.LAST_24_HOURS,
) -> AnalyticsResponse:
    """Everything the dashboard and analytics pages need, for one range."""
    await get_project(session, project_id)
    start, end, bucket = resolve_range(time_range)

    summary, breakdown = await _summary(session, project_id, start, end)
    series = await _time_series(session, project_id, start, end, bucket)
    usage = await endpoint_usage(session, project_id, start, end)

    endpoint_counts = (
        await session.execute(
            select(
                func.count(Endpoint.id),
                func.count(case((Endpoint.enabled.is_(True), 1))),
            ).where(Endpoint.project_id == project_id)
        )
    ).one()
    total_endpoints, enabled_endpoints = endpoint_counts

    scope = (
        RequestLog.project_id == project_id,
        RequestLog.created_at >= start,
        RequestLog.created_at <= end,
    )

    method_rows = (
        await session.execute(
            select(RequestLog.method, func.count(RequestLog.id))
            .where(*scope)
            .group_by(RequestLog.method)
            .order_by(func.count(RequestLog.id).desc())
        )
    ).all()

    status_rows = (
        await session.execute(
            select(RequestLog.status_code, func.count(RequestLog.id))
            .where(*scope)
            .group_by(RequestLog.status_code)
            .order_by(func.count(RequestLog.id).desc())
        )
    ).all()

    return AnalyticsResponse(
        time_range=time_range,
        start=start,
        end=end,
        summary=summary,
        status_breakdown=breakdown,
        endpoints=_highlights(usage, total_endpoints or 0, enabled_endpoints or 0),
        time_series=series,
        by_endpoint=usage[:10],
        by_method=[MethodCount(method=m, count=c) for m, c in method_rows],
        by_status_code=[
            StatusCodeCount(status_code=code, count=count) for code, count in status_rows
        ],
    )


async def get_endpoint_time_series(
    session: AsyncSession,
    project_id: uuid.UUID,
    endpoint_id: uuid.UUID,
    time_range: TimeRange = TimeRange.LAST_24_HOURS,
) -> list[TimeSeriesPoint]:
    """The volume/latency chart for a single endpoint's detail page."""
    start, end, bucket = resolve_range(time_range)
    bucket_seconds = int(bucket.total_seconds())
    index = _bucket_index(session, bucket_seconds)

    rows = (
        await session.execute(
            select(
                index.label("bucket"),
                func.count(RequestLog.id),
                func.count(case((_IS_SUCCESS, 1))),
                func.avg(cast(RequestLog.response_time_ms, Float)),
            )
            .where(
                RequestLog.project_id == project_id,
                RequestLog.endpoint_id == endpoint_id,
                RequestLog.created_at >= start,
                RequestLog.created_at <= end,
            )
            .group_by(index)
        )
    ).all()

    by_bucket = {
        int(bucket_id): (total, successful, avg_ms)
        for bucket_id, total, successful, avg_ms in rows
        if bucket_id is not None
    }
    points: list[TimeSeriesPoint] = []
    first = int(start.timestamp()) // bucket_seconds
    last = int(end.timestamp()) // bucket_seconds
    for bucket_id in range(first, last + 1):
        total, successful, avg_ms = by_bucket.get(bucket_id, (0, 0, None))
        points.append(
            TimeSeriesPoint(
                timestamp=datetime.fromtimestamp(
                    bucket_id * bucket_seconds, tz=timezone.utc
                ),
                total=total or 0,
                successful=successful or 0,
                failed=(total or 0) - (successful or 0),
                avg_response_time_ms=(
                    round(float(avg_ms), 2) if avg_ms is not None else 0.0
                ),
            )
        )
    return points


async def get_endpoint_status_distribution(
    session: AsyncSession, project_id: uuid.UUID, endpoint_id: uuid.UUID
) -> list[StatusCodeCount]:
    """Status-code counts for one endpoint, across all time."""
    rows = (
        await session.execute(
            select(RequestLog.status_code, func.count(RequestLog.id))
            .where(
                RequestLog.project_id == project_id,
                RequestLog.endpoint_id == endpoint_id,
            )
            .group_by(RequestLog.status_code)
            .order_by(func.count(RequestLog.id).desc())
        )
    ).all()
    return [StatusCodeCount(status_code=code, count=count) for code, count in rows]
