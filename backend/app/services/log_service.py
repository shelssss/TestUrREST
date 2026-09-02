"""Writing request logs and reading them back with filters and paging."""

from __future__ import annotations

import json
import secrets
import uuid

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.core.errors import LogNotFoundError
from app.models import RequestLog
from app.schemas.common import Page
from app.schemas.log import LogDetail, LogFilters, LogListItem, StatusCategory
from app.services.project_service import get_project
from app.utils.redaction import redact_headers, redact_json_body, redact_params


def generate_request_id() -> str:
    """A short, collision-resistant correlation id, e.g. req_8f32a91c4b0d."""
    return f"req_{secrets.token_hex(6)}"


def _prepare_body(body: str | None) -> tuple[str | None, bool]:
    """Redact and size-cap a body before it is stored.

    JSON bodies are parsed so secret-looking keys can be masked; anything
    else is stored verbatim. Returns (body, was_truncated).
    """
    if body is None:
        return None, False

    cleaned = body
    stripped = body.lstrip()
    if stripped[:1] in "{[":
        try:
            cleaned = json.dumps(redact_json_body(json.loads(body)))
        except (ValueError, TypeError):
            cleaned = body  # not valid JSON after all -- keep the raw text

    limit = settings.max_logged_body_bytes
    if len(cleaned) > limit:
        return cleaned[:limit], True
    return cleaned, False


async def create_log(
    session: AsyncSession,
    *,
    project_id: uuid.UUID,
    endpoint_id: uuid.UUID | None,
    request_id: str,
    method: str,
    url: str,
    request_headers: dict[str, str] | None,
    query_parameters: dict[str, str] | None,
    request_body: str | None,
    status_code: int | None,
    response_headers: dict[str, str] | None,
    response_body: str | None,
    response_time_ms: int,
    response_size: int,
    error_message: str | None = None,
    client_ip: str | None = None,
    user_agent: str | None = None,
) -> RequestLog:
    """Persist one request/response pair.

    Everything sensitive is masked here rather than at read time, so the
    database never holds a usable credential.
    """
    stored_request_body, _ = _prepare_body(request_body)
    stored_response_body, _ = _prepare_body(response_body)

    log = RequestLog(
        project_id=project_id,
        endpoint_id=endpoint_id,
        request_id=request_id,
        method=method,
        url=url,
        request_headers=redact_headers(request_headers),
        query_parameters=redact_params(query_parameters),
        request_body=stored_request_body,
        status_code=status_code,
        response_headers=redact_headers(response_headers) if response_headers else None,
        response_body=stored_response_body,
        response_time_ms=response_time_ms,
        response_size=response_size,
        error_message=error_message,
        client_ip=client_ip,
        user_agent=user_agent,
    )
    session.add(log)
    await session.commit()
    await session.refresh(log)
    return log


def _apply_filters(query: Select, filters: LogFilters) -> Select:
    """Translate the filter model into SQL predicates."""
    if filters.method:
        query = query.where(RequestLog.method == filters.method.upper())

    if filters.status_code is not None:
        query = query.where(RequestLog.status_code == filters.status_code)

    match filters.status_category:
        case StatusCategory.SUCCESS_2XX:
            query = query.where(RequestLog.status_code.between(200, 299))
        case StatusCategory.REDIRECT_3XX:
            query = query.where(RequestLog.status_code.between(300, 399))
        case StatusCategory.CLIENT_ERROR_4XX:
            query = query.where(RequestLog.status_code.between(400, 499))
        case StatusCategory.SERVER_ERROR_5XX:
            query = query.where(RequestLog.status_code.between(500, 599))
        case StatusCategory.FAILED:
            # No response was ever received (timeout / connection error).
            query = query.where(RequestLog.status_code.is_(None))
        case _:
            pass

    if filters.endpoint_id is not None:
        query = query.where(RequestLog.endpoint_id == filters.endpoint_id)

    if filters.start_date is not None:
        query = query.where(RequestLog.created_at >= filters.start_date)
    if filters.end_date is not None:
        query = query.where(RequestLog.created_at <= filters.end_date)

    if filters.min_response_time_ms is not None:
        query = query.where(RequestLog.response_time_ms >= filters.min_response_time_ms)
    if filters.max_response_time_ms is not None:
        query = query.where(RequestLog.response_time_ms <= filters.max_response_time_ms)

    if filters.search:
        term = f"%{filters.search.strip()}%"
        query = query.where(
            or_(
                RequestLog.url.ilike(term),
                RequestLog.request_id.ilike(term),
                RequestLog.method.ilike(term),
            )
        )

    return query


async def list_logs(
    session: AsyncSession, project_id: uuid.UUID, filters: LogFilters
) -> Page[LogListItem]:
    """A page of logs, newest first.

    Only the requested page is read; the total comes from a separate COUNT
    so the browser never receives the whole table.
    """
    await get_project(session, project_id)

    base = select(RequestLog).where(RequestLog.project_id == project_id)
    base = _apply_filters(base, filters)

    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0

    offset = (filters.page - 1) * filters.limit
    result = await session.execute(
        base.order_by(RequestLog.created_at.desc(), RequestLog.id.desc())
        .offset(offset)
        .limit(filters.limit)
    )
    items = [LogListItem.model_validate(row) for row in result.scalars().all()]
    return Page.build(items, total, filters.page, filters.limit)


async def get_log(
    session: AsyncSession, project_id: uuid.UUID, request_id: str
) -> LogDetail:
    """One log's full detail, looked up by its public request id."""
    result = await session.execute(
        select(RequestLog)
        .options(joinedload(RequestLog.endpoint))
        .where(
            RequestLog.project_id == project_id,
            RequestLog.request_id == request_id,
        )
    )
    log = result.scalar_one_or_none()
    if log is None:
        raise LogNotFoundError()

    detail = LogDetail.model_validate(log)
    if log.endpoint is not None:
        detail.endpoint_path = f"{log.endpoint.method} {log.endpoint.path}"
    return detail


async def list_endpoint_logs(
    session: AsyncSession,
    project_id: uuid.UUID,
    endpoint_id: uuid.UUID,
    limit: int = 20,
) -> list[LogListItem]:
    """The most recent requests for one endpoint (used on its detail page)."""
    result = await session.execute(
        select(RequestLog)
        .where(
            RequestLog.project_id == project_id,
            RequestLog.endpoint_id == endpoint_id,
        )
        .order_by(RequestLog.created_at.desc())
        .limit(limit)
    )
    return [LogListItem.model_validate(row) for row in result.scalars().all()]


async def list_recent_logs(
    session: AsyncSession, project_id: uuid.UUID, limit: int = 10
) -> list[LogListItem]:
    """The newest requests in a project, for the dashboard activity feed."""
    result = await session.execute(
        select(RequestLog)
        .where(RequestLog.project_id == project_id)
        .order_by(RequestLog.created_at.desc())
        .limit(limit)
    )
    return [LogListItem.model_validate(row) for row in result.scalars().all()]
