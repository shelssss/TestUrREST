"""The API proxy: forward a request, measure it, log it, return it.

This is the heart of the platform. The browser never calls the target API
directly -- it asks the backend to, which is what makes every request
observable and is the seam a real API gateway would later grow from.

The flow, per section 22 of the spec:

    validate project -> resolve endpoint -> build target request ->
    forward -> measure -> capture -> log -> return

A failure at the network stage is not an error case that gets swallowed:
timeouts and connection failures are logged exactly like successes, so the
analytics reflect what actually happened.
"""

from __future__ import annotations

import json
import time
import uuid

import httpx

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import (
    EndpointNotFoundError,
    InvalidTargetUrlError,
    ValidationError,
)
from app.models import Endpoint, METHODS_WITH_BODY, HttpMethod
from app.schemas.request import ProxyRequest, ProxyResponse
from app.services import log_service
from app.services.endpoint_service import get_endpoint
from app.services.project_service import get_project
from app.utils.validation import join_url, validate_target_url

#: Headers we refuse to forward: they describe the browser-to-backend hop
#: and would corrupt the backend-to-target hop if copied verbatim.
_HOP_BY_HOP_HEADERS = frozenset(
    {
        "host",
        "content-length",
        "connection",
        "keep-alive",
        "transfer-encoding",
        "upgrade",
        "proxy-connection",
        "te",
        "trailer",
        "accept-encoding",
    }
)

#: Body content types we can safely decode to text for the response viewer.
_TEXTUAL_HINTS = ("json", "text", "xml", "javascript", "html", "csv", "yaml")


def _clean_headers(headers: dict[str, str]) -> dict[str, str]:
    """Drop hop-by-hop headers and any blank entries from the UI's rows."""
    return {
        name.strip(): value
        for name, value in headers.items()
        if name.strip() and name.strip().lower() not in _HOP_BY_HOP_HEADERS
    }


def _clean_params(params: dict[str, str]) -> dict[str, str]:
    """Drop the empty rows the parameter editor leaves behind."""
    return {key.strip(): value for key, value in params.items() if key.strip()}


def _is_textual(content_type: str | None) -> bool:
    if not content_type:
        return False
    lowered = content_type.lower()
    return any(hint in lowered for hint in _TEXTUAL_HINTS)


def _decode_body(response: httpx.Response) -> tuple[str | None, bool]:
    """Return the response body as text plus whether it parsed as JSON.

    Binary payloads are not stored as mojibake: they get a short placeholder
    instead, so the log stays readable and the database stays small.
    """
    content_type = response.headers.get("content-type", "")
    if not response.content:
        return None, False

    if not _is_textual(content_type):
        size = len(response.content)
        label = content_type.split(";")[0].strip() or "unknown"
        return f"<binary {label} response, {size} bytes>", False

    try:
        text = response.text
    except (UnicodeDecodeError, ValueError):  # pragma: no cover - defensive
        return f"<undecodable response, {len(response.content)} bytes>", False

    is_json = "json" in content_type.lower()
    if is_json:
        # Confirm it really is JSON before telling the UI to use the JSON
        # viewer -- some APIs mislabel error pages as application/json.
        try:
            json.loads(text)
        except ValueError:
            is_json = False

    return text, is_json


async def _resolve_target(
    session: AsyncSession,
    project_id: uuid.UUID,
    payload: ProxyRequest,
) -> tuple[str, Endpoint | None]:
    """Work out where the request should go, and what it belongs to.

    An explicit URL always wins. Otherwise the endpoint's target URL is
    used, resolved against the project's base URL when it is relative.
    """
    endpoint: Endpoint | None = None

    if payload.endpoint_id is not None:
        endpoint = await get_endpoint(session, project_id, payload.endpoint_id)
        if not endpoint.enabled:
            raise ValidationError(
                f"Endpoint {endpoint.method} {endpoint.path} is disabled"
            )

    explicit_url = (payload.url or "").strip()
    if explicit_url:
        return explicit_url, endpoint

    if endpoint is None:  # pragma: no cover - schema validation covers this
        raise ValidationError("Provide either a URL or an endpoint")

    project = await get_project(session, project_id)
    return join_url(project.base_url, endpoint.target_url), endpoint


async def send_request(
    session: AsyncSession,
    project_id: uuid.UUID,
    payload: ProxyRequest,
    *,
    client_ip: str | None = None,
    user_agent: str | None = None,
) -> ProxyResponse:
    """Forward one request to its target and record what happened.

    Returns a ProxyResponse in every outcome. A target that times out or
    refuses the connection produces a log with a null status code and an
    error message rather than an exception, because "the target was down"
    is data the monitoring platform exists to capture.
    """
    await get_project(session, project_id)

    raw_url, endpoint = await _resolve_target(session, project_id, payload)
    # Raises InvalidTargetUrlError for unroutable or private targets before
    # any socket is opened.
    target_url = validate_target_url(raw_url)

    method = payload.method
    headers = _clean_headers(payload.headers)
    params = _clean_params(payload.query_parameters)

    body = payload.body
    if body is not None and method not in METHODS_WITH_BODY:
        body = None  # GET/HEAD/OPTIONS bodies are dropped, not forwarded

    timeout = min(
        payload.timeout_seconds or settings.proxy_timeout_seconds,
        settings.proxy_max_timeout_seconds,
    )

    request_id = log_service.generate_request_id()
    status_code: int | None = None
    status_text: str | None = None
    response_headers: dict[str, str] | None = None
    response_body: str | None = None
    response_size = 0
    is_json = False
    error: str | None = None

    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=False,
            # The platform reports what the target actually returned, so a
            # 301 is a result to show, not something to silently follow.
        ) as client:
            response = await client.request(
                method.value,
                target_url,
                params=params or None,
                headers=headers or None,
                content=body.encode("utf-8") if body is not None else None,
            )
        elapsed_ms = int((time.perf_counter() - started) * 1000)

        status_code = response.status_code
        status_text = response.reason_phrase or None
        response_headers = dict(response.headers)
        response_size = len(response.content)
        response_body, is_json = _decode_body(response)

    except httpx.TimeoutException:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        error = f"The target API did not respond within {timeout:g}s"
    except httpx.TooManyRedirects:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        error = "The target API returned too many redirects"
    except httpx.ConnectError:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        error = "Could not connect to the target API"
    except httpx.InvalidURL as exc:
        raise InvalidTargetUrlError(f"Invalid target URL: {exc}") from exc
    except httpx.HTTPError as exc:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        error = f"Request to the target API failed: {type(exc).__name__}"

    log = await log_service.create_log(
        session,
        project_id=project_id,
        endpoint_id=endpoint.id if endpoint else None,
        request_id=request_id,
        method=method.value,
        url=target_url,
        request_headers=headers,
        query_parameters=params,
        request_body=body,
        status_code=status_code,
        response_headers=response_headers,
        response_body=response_body,
        response_time_ms=elapsed_ms,
        response_size=response_size,
        error_message=error,
        client_ip=client_ip,
        user_agent=user_agent,
    )

    # The response returned to the browser is built from the stored log, so
    # the viewer shows exactly what was persisted -- redactions included.
    return ProxyResponse(
        request_id=log.request_id,
        log_id=log.id,
        endpoint_id=log.endpoint_id,
        method=HttpMethod(log.method),
        url=log.url,
        status_code=log.status_code,
        status_text=status_text,
        response_time_ms=log.response_time_ms,
        response_size=log.response_size,
        headers=log.response_headers or {},
        body=log.response_body,
        is_json=is_json,
        body_truncated=(
            response_body is not None
            and log.response_body is not None
            and len(log.response_body) < len(response_body)
        ),
        error=log.error_message,
        created_at=log.created_at,
    )
