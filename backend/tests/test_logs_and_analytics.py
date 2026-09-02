"""Log filtering, pagination, and the analytics aggregations."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RequestLog


@pytest_asyncio.fixture
async def seeded(client: AsyncClient, project: dict, session: AsyncSession) -> dict:
    """A project with an endpoint and a spread of logs to aggregate.

    Rows are inserted directly so the fixture can control timestamps and
    status codes precisely -- going through the proxy would make the data
    depend on wall-clock timing.
    """
    endpoint = (
        await client.post(
            f"/api/projects/{project['id']}/endpoints",
            json={
                "method": "GET",
                "path": "/products",
                "target_url": "https://api.example.com/products",
            },
        )
    ).json()

    now = datetime.now(timezone.utc)
    # (status, response_time_ms, minutes_ago)
    rows = [
        (200, 80, 1),
        (200, 90, 2),
        (201, 140, 3),
        (301, 40, 4),
        (404, 60, 5),
        (500, 930, 6),
        (None, 30000, 7),   # target never answered
    ]
    for index, (status, ms, minutes) in enumerate(rows):
        session.add(
            RequestLog(
                id=uuid.uuid4(),
                request_id=f"req_seed{index:04d}",
                project_id=uuid.UUID(project["id"]),
                endpoint_id=uuid.UUID(endpoint["id"]),
                method="GET" if index % 2 == 0 else "POST",
                url="https://api.example.com/products",
                request_headers={},
                query_parameters={},
                request_body=None,
                status_code=status,
                response_headers={} if status else None,
                response_body=None,
                response_time_ms=ms,
                response_size=100,
                error_message=None if status else "timeout",
                created_at=now - timedelta(minutes=minutes),
            )
        )
    await session.commit()
    return {"project": project, "endpoint": endpoint}


async def test_logs_are_paginated_newest_first(client: AsyncClient, seeded: dict) -> None:
    project_id = seeded["project"]["id"]
    page = (
        await client.get(f"/api/projects/{project_id}/logs", params={"limit": 3})
    ).json()

    assert page["total"] == 7
    assert page["pages"] == 3
    assert page["page"] == 1
    assert len(page["items"]) == 3
    # newest first
    timestamps = [item["created_at"] for item in page["items"]]
    assert timestamps == sorted(timestamps, reverse=True)


async def test_second_page_returns_different_rows(
    client: AsyncClient, seeded: dict
) -> None:
    project_id = seeded["project"]["id"]
    first = (
        await client.get(f"/api/projects/{project_id}/logs", params={"limit": 3, "page": 1})
    ).json()
    second = (
        await client.get(f"/api/projects/{project_id}/logs", params={"limit": 3, "page": 2})
    ).json()

    first_ids = {item["request_id"] for item in first["items"]}
    second_ids = {item["request_id"] for item in second["items"]}
    assert first_ids.isdisjoint(second_ids)


@pytest.mark.parametrize(
    ("category", "expected"),
    [("2xx", 3), ("3xx", 1), ("4xx", 1), ("5xx", 1), ("failed", 1), ("all", 7)],
)
async def test_status_category_filter(
    client: AsyncClient, seeded: dict, category: str, expected: int
) -> None:
    project_id = seeded["project"]["id"]
    page = (
        await client.get(
            f"/api/projects/{project_id}/logs", params={"status_category": category}
        )
    ).json()
    assert page["total"] == expected


async def test_method_and_response_time_filters(
    client: AsyncClient, seeded: dict
) -> None:
    project_id = seeded["project"]["id"]

    by_method = (
        await client.get(f"/api/projects/{project_id}/logs", params={"method": "POST"})
    ).json()
    assert by_method["total"] == 3
    assert {item["method"] for item in by_method["items"]} == {"POST"}

    slow = (
        await client.get(
            f"/api/projects/{project_id}/logs", params={"min_response_time_ms": 900}
        )
    ).json()
    assert slow["total"] == 2   # the 930ms 500 and the 30s timeout


async def test_search_matches_request_id(client: AsyncClient, seeded: dict) -> None:
    project_id = seeded["project"]["id"]
    page = (
        await client.get(
            f"/api/projects/{project_id}/logs", params={"search": "req_seed0003"}
        )
    ).json()
    assert page["total"] == 1
    assert page["items"][0]["request_id"] == "req_seed0003"


async def test_log_detail_includes_the_full_record(
    client: AsyncClient, seeded: dict
) -> None:
    project_id = seeded["project"]["id"]
    detail = (
        await client.get(f"/api/projects/{project_id}/logs/req_seed0000")
    ).json()
    assert detail["request_id"] == "req_seed0000"
    assert detail["status_code"] == 200
    assert detail["endpoint_path"] == "GET /products"
    assert "request_headers" in detail and "response_headers" in detail


async def test_missing_log_returns_404(client: AsyncClient, project: dict) -> None:
    response = await client.get(f"/api/projects/{project['id']}/logs/req_nope")
    assert response.status_code == 404
    assert response.json() == {"detail": "Request log not found"}


async def test_analytics_summary_counts_and_rates(
    client: AsyncClient, seeded: dict
) -> None:
    """2xx and 3xx count as success; 4xx, 5xx and no-response are failures."""
    project_id = seeded["project"]["id"]
    data = (await client.get(f"/api/projects/{project_id}/analytics")).json()

    summary = data["summary"]
    assert summary["total_requests"] == 7
    assert summary["successful_requests"] == 4      # 200, 200, 201, 301
    assert summary["failed_requests"] == 3          # 404, 500, no-response
    assert summary["success_rate"] == pytest.approx(57.14, abs=0.01)
    assert summary["error_rate"] == pytest.approx(42.86, abs=0.01)
    assert summary["avg_response_time_ms"] > 0


async def test_analytics_status_breakdown(client: AsyncClient, seeded: dict) -> None:
    project_id = seeded["project"]["id"]
    data = (await client.get(f"/api/projects/{project_id}/analytics")).json()
    assert data["status_breakdown"] == {
        "success_2xx": 3,
        "redirect_3xx": 1,
        "client_error_4xx": 1,
        "server_error_5xx": 1,
        "failed": 1,
    }


async def test_analytics_groups_by_method_and_status(
    client: AsyncClient, seeded: dict
) -> None:
    project_id = seeded["project"]["id"]
    data = (await client.get(f"/api/projects/{project_id}/analytics")).json()

    by_method = {row["method"]: row["count"] for row in data["by_method"]}
    assert by_method == {"GET": 4, "POST": 3}

    by_status = {row["status_code"]: row["count"] for row in data["by_status_code"]}
    assert by_status[200] == 2
    assert by_status[500] == 1
    assert by_status[None] == 1


async def test_analytics_endpoint_highlights(client: AsyncClient, seeded: dict) -> None:
    project_id = seeded["project"]["id"]
    data = (await client.get(f"/api/projects/{project_id}/analytics")).json()

    endpoints = data["endpoints"]
    assert endpoints["total_endpoints"] == 1
    assert endpoints["enabled_endpoints"] == 1
    assert endpoints["most_used"]["path"] == "/products"
    assert endpoints["most_used"]["request_count"] == 7
    assert endpoints["most_errors"]["error_count"] == 3


async def test_time_series_is_gap_filled(client: AsyncClient, seeded: dict) -> None:
    """Quiet buckets come back as zeroes so charts do not interpolate."""
    project_id = seeded["project"]["id"]
    data = (
        await client.get(f"/api/projects/{project_id}/analytics", params={"range": "24h"})
    ).json()

    series = data["time_series"]
    assert len(series) >= 24
    assert sum(point["total"] for point in series) == 7
    assert any(point["total"] == 0 for point in series)
    timestamps = [point["timestamp"] for point in series]
    assert timestamps == sorted(timestamps)


async def test_short_range_excludes_older_traffic(
    client: AsyncClient, seeded: dict, session: AsyncSession
) -> None:
    """A 1h window must not count a request from two days ago."""
    project_id = seeded["project"]["id"]
    session.add(
        RequestLog(
            id=uuid.uuid4(),
            request_id="req_ancient",
            project_id=uuid.UUID(project_id),
            endpoint_id=None,
            method="GET",
            url="https://api.example.com/old",
            request_headers={},
            query_parameters={},
            status_code=200,
            response_time_ms=10,
            response_size=1,
            created_at=datetime.now(timezone.utc) - timedelta(days=2),
        )
    )
    await session.commit()

    hour = (
        await client.get(f"/api/projects/{project_id}/analytics", params={"range": "1h"})
    ).json()
    month = (
        await client.get(f"/api/projects/{project_id}/analytics", params={"range": "30d"})
    ).json()

    assert hour["summary"]["total_requests"] == 7
    assert month["summary"]["total_requests"] == 8


async def test_analytics_for_an_empty_project_is_all_zeroes(
    client: AsyncClient
) -> None:
    """An untouched project renders a real dashboard, not an error."""
    empty = (await client.post("/api/projects", json={"name": "Fresh"})).json()
    data = (await client.get(f"/api/projects/{empty['id']}/analytics")).json()

    assert data["summary"]["total_requests"] == 0
    assert data["summary"]["success_rate"] == 0.0
    assert data["endpoints"]["most_used"] is None
    assert data["by_endpoint"] == []
    assert all(point["total"] == 0 for point in data["time_series"])


async def test_endpoint_stats(client: AsyncClient, seeded: dict) -> None:
    project_id = seeded["project"]["id"]
    endpoint_id = seeded["endpoint"]["id"]
    stats = (
        await client.get(
            f"/api/projects/{project_id}/endpoints/{endpoint_id}/stats"
        )
    ).json()

    assert stats["total_requests"] == 7
    assert stats["successful_requests"] == 4
    assert stats["min_response_time_ms"] == 40
    assert stats["max_response_time_ms"] == 30000
    assert stats["last_request_at"] is not None


async def test_analytics_are_isolated_between_projects(
    client: AsyncClient, seeded: dict
) -> None:
    """The whole point of projects: one project's traffic is its own."""
    other = (await client.post("/api/projects", json={"name": "Other"})).json()
    data = (await client.get(f"/api/projects/{other['id']}/analytics")).json()

    assert data["summary"]["total_requests"] == 0
    logs = (await client.get(f"/api/projects/{other['id']}/logs")).json()
    assert logs["total"] == 0
