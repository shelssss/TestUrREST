"""Sensitive data must never reach the database in usable form."""

import httpx
import pytest
from httpx import AsyncClient

from app.services import proxy_service
from app.utils.redaction import MASK, redact_headers, redact_json_body, redact_params


def test_auth_header_keeps_its_scheme_but_loses_the_credential() -> None:
    out = redact_headers({"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6"})
    assert out["Authorization"] == f"Bearer {MASK}"
    assert "eyJ" not in out["Authorization"]


def test_cookies_are_fully_masked() -> None:
    out = redact_headers({"Cookie": "session=abc123", "Set-Cookie": "session=abc123"})
    assert out["Cookie"] == MASK
    assert out["Set-Cookie"] == MASK


def test_ordinary_headers_survive_untouched() -> None:
    out = redact_headers({"Content-Type": "application/json", "Accept": "*/*"})
    assert out == {"Content-Type": "application/json", "Accept": "*/*"}


def test_header_matching_is_case_insensitive() -> None:
    assert redact_headers({"AUTHORIZATION": "token abc"})["AUTHORIZATION"] == f"token {MASK}"
    assert redact_headers({"x-api-key": "k"})["x-api-key"] == MASK


def test_secret_query_parameters_are_masked() -> None:
    out = redact_params({"page": "1", "api_key": "secret", "access_token": "t"})
    assert out["page"] == "1"
    assert out["api_key"] == MASK
    assert out["access_token"] == MASK


def test_nested_json_secrets_are_masked() -> None:
    out = redact_json_body(
        {
            "user": "ada",
            "password": "hunter2",
            "nested": [{"client_secret": "s", "keep": 1}],
        }
    )
    assert out["user"] == "ada"
    assert out["password"] == MASK
    assert out["nested"][0]["client_secret"] == MASK
    assert out["nested"][0]["keep"] == 1


@pytest.fixture
def target(monkeypatch):
    real_client = httpx.AsyncClient

    def install(handler):
        def factory(*args, **kwargs):
            kwargs["transport"] = httpx.MockTransport(handler)
            return real_client(*args, **kwargs)

        monkeypatch.setattr(proxy_service.httpx, "AsyncClient", factory)

    return install


async def test_credentials_are_redacted_in_the_stored_log(
    client: AsyncClient, project: dict, target
) -> None:
    """End-to-end: a real token goes out, but only a mask is persisted."""
    token = "Bearer supersecrettoken123"
    target(
        lambda request: httpx.Response(
            200,
            json={"ok": True},
            headers={"set-cookie": "session=xyz", "content-type": "application/json"},
        )
    )

    response = await client.post(
        f"/api/projects/{project['id']}/requests",
        json={
            "method": "POST",
            "url": "https://api.example.com/login",
            "headers": {"Authorization": token, "Content-Type": "application/json"},
            "query_parameters": {"api_key": "leaky", "page": "1"},
            "body": '{"username": "ada", "password": "hunter2"}',
        },
    )
    request_id = response.json()["request_id"]

    detail = (
        await client.get(f"/api/projects/{project['id']}/logs/{request_id}")
    ).json()

    assert detail["request_headers"]["Authorization"] == f"Bearer {MASK}"
    assert "supersecrettoken123" not in str(detail)
    assert detail["query_parameters"]["api_key"] == MASK
    assert detail["query_parameters"]["page"] == "1"
    assert "hunter2" not in detail["request_body"]
    assert detail["response_headers"]["set-cookie"] == MASK
