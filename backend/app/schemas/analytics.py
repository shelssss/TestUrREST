"""Analytics schemas -- all values are computed by aggregation queries."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class TimeRange(StrEnum):
    """Supported dashboard windows."""

    LAST_HOUR = "1h"
    LAST_24_HOURS = "24h"
    LAST_7_DAYS = "7d"
    LAST_30_DAYS = "30d"


class RequestSummary(BaseModel):
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    success_rate: float = 0.0
    error_rate: float = 0.0
    avg_response_time_ms: float = 0.0
    p95_response_time_ms: float = 0.0


class StatusBreakdown(BaseModel):
    """Counts per status class, plus requests that never got a response."""

    success_2xx: int = 0
    redirect_3xx: int = 0
    client_error_4xx: int = 0
    server_error_5xx: int = 0
    failed: int = 0


class EndpointUsage(BaseModel):
    endpoint_id: uuid.UUID | None
    method: str
    path: str
    request_count: int
    avg_response_time_ms: float
    error_count: int
    success_rate: float


class EndpointHighlights(BaseModel):
    """The "most X" cards on the project dashboard.

    Each is ``None`` until the project has traffic to rank.
    """

    total_endpoints: int = 0
    enabled_endpoints: int = 0
    most_used: EndpointUsage | None = None
    slowest: EndpointUsage | None = None
    most_successful: EndpointUsage | None = None
    most_errors: EndpointUsage | None = None


class TimeSeriesPoint(BaseModel):
    """One bucket of the request-volume / latency charts."""

    timestamp: datetime
    total: int = 0
    successful: int = 0
    failed: int = 0
    avg_response_time_ms: float = 0.0


class MethodCount(BaseModel):
    method: str
    count: int


class StatusCodeCount(BaseModel):
    status_code: int | None
    count: int


class AnalyticsResponse(BaseModel):
    """Everything the dashboard and analytics pages render."""

    time_range: TimeRange
    start: datetime
    end: datetime
    summary: RequestSummary
    status_breakdown: StatusBreakdown
    endpoints: EndpointHighlights
    time_series: list[TimeSeriesPoint] = []
    by_endpoint: list[EndpointUsage] = []
    by_method: list[MethodCount] = []
    by_status_code: list[StatusCodeCount] = []
