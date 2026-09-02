"""The core request flow: send -> forward -> measure -> log -> return."""

import httpx
import pytest
from httpx import AsyncClient

from app.services import proxy_service


@pytest.fixture
def target(monkeypatch):
    """Replace the outbound HTTP transport with a scripted fake target.

    The proxy builds its own AsyncClient, so the client class is swapped for
    a factory that injects a MockTransport. Everything else in the proxy --
    header cleaning, timing, decoding, logging -- runs for real.
    """
    real_client = httpx.AsyncClient
    seen: list[httpx.Request] = []

    def install(handler):
        def factory(*args, **kwargs):
            kwargs["transport"] = httpx.MockTransport(_record(handler))
            return real_client(*args, **kwargs)

        monkeypatch.setattr(proxy_service.httpx, "AsyncClient", factory)
        return seen

    def _record(handler):
        def wrapped(request: httpx.Request) -> httpx.Response:
            seen.append(request)
            return handler(request)

        return wrapped

    install.requests = seen
    return install


async def _endpoint(client: AsyncClient, project_id: str, **overrides) -> dict:
    payload = {
        "method": "POST",
        "path": "/orders",
        "target_url": "https://api.example.com/orders",
    } | overrides
    return (
        await client.post(f"/api/projects/{project_id}/endpoints", json=payload)
    ).json()


async def test_successful_request_is_forwarded_and_logged(
    client: AsyncClient, project: dict, target
) -> None:
    target(
        lambda request: httpx.Response(
            201,
            json={"id": 9, "status": "created"},
            headers={"content-type": "application/json"},
        )
    )
    endpoint = await _endpoint(client, project["id"])

    response = await client.post(
        f"/api/projects/{project['id']}/requests",
        json={
            "method": "POST",
            "endpoint_id": endpoint["id"],
            "body": '{"product_id": 123, "quantity": 2}',
            "headers": {"Content-Type": "application/json"},
            "query_parameters": {"source": "explorer"},
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["status_code"] == 201
    assert body["is_json"] is True
    assert body["error"] is None
    assert body["request_id"].startswith("req_")
    assert body["response_time_ms"] >= 0
    assert body["response_size"] > 0
    assert body["endpoint_id"] == endpoint["id"]

    # the target actually received what we built
    sent = target.requests[-1]
    assert sent.method == "POST"
    assert str(sent.url) == "https://api.example.com/orders?source=explorer"
    assert sent.content == b'{"product_id": 123, "quantity": 2}'

    # and the call produced a durable log
    log = await client.get(f"/api/projects/{project['id']}/logs/{body['request_id']}")
    assert log.status_code == 200
    assert log.json()["status_code"] == 201


async def test_ad_hoc_url_request_needs_no_endpoint(
    client: AsyncClient, project: dict, target
) -> None:
    target(lambda request: httpx.Response(200, text="pong"))
    response = await client.post(
        f"/api/projects/{project['id']}/requests",
        json={"method": "GET", "url": "https://api.example.com/ping"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status_code"] == 200
    assert body["endpoint_id"] is None
    assert body["body"] == "pong"
    assert body["is_json"] is False


async def test_timeout_is_recorded_not_raised(
    client: AsyncClient, project: dict, target
) -> None:
    """A dead target is data the platform captures, not a 500."""

    def timeout(request):
        raise httpx.ConnectTimeout("timed out", request=request)

    target(timeout)
    response = await client.post(
        f"/api/projects/{project['id']}/requests",
        json={"method": "GET", "url": "https://api.example.com/slow"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status_code"] is None
    assert "did not respond" in body["error"]

    log = await client.get(f"/api/projects/{project['id']}/logs/{body['request_id']}")
    assert log.json()["status_code"] is None
    assert log.json()["error_message"]


async def test_connection_failure_is_recorded(
    client: AsyncClient, project: dict, target
) -> None:
    def refuse(request):
        raise httpx.ConnectError("refused", request=request)

    target(refuse)
    response = await client.post(
        f"/api/projects/{project['id']}/requests",
        json={"method": "GET", "url": "https://api.example.com/down"},
    )
    assert response.json()["error"] == "Could not connect to the target API"


async def test_target_error_status_is_passed_through(
    client: AsyncClient, project: dict, target
) -> None:
    """A 500 from the target is a successful proxy call reporting a 500."""
    target(lambda request: httpx.Response(500, json={"detail": "boom"}))
    response = await client.post(
        f"/api/projects/{project['id']}/requests",
        json={"method": "GET", "url": "https://api.example.com/broken"},
    )
    assert response.status_code == 200
    assert response.json()["status_code"] == 500
    assert response.json()["error"] is None


async def test_disabled_endpoint_is_refused(
    client: AsyncClient, project: dict, target
) -> None:
    target(lambda request: httpx.Response(200))
    endpoint = await _endpoint(client, project["id"], enabled=False)
    response = await client.post(
        f"/api/projects/{project['id']}/requests",
        json={"method": "POST", "endpoint_id": endpoint["id"]},
    )
    assert response.status_code == 422
    assert "disabled" in response.json()["detail"]


async def test_request_needs_a_destination(client: AsyncClient, project: dict) -> None:
    response = await client.post(
        f"/api/projects/{project['id']}/requests", json={"method": "GET"}
    )
    assert response.status_code == 422


async def test_unknown_project_returns_404(client: AsyncClient) -> None:
    response = await client.post(
        "/api/projects/00000000-0000-0000-0000-000000000000/requests",
        json={"method": "GET", "url": "https://api.example.com/x"},
    )
    assert response.status_code == 404
