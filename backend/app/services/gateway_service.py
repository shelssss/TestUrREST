"""Path-transparent gateway.

The explicit proxy in ``proxy_service`` is opt-in: a caller names a target
URL in a JSON body. That works for the API Explorer, but it cannot capture
traffic from an application that is simply calling its API normally.

This module is the other half. A client points its base URL at

    http://platform/gw/{project_id}/...

and keeps making ordinary requests. The gateway matches the incoming path
against the project's registered endpoints, forwards to the real target,
returns the real response untouched, and records the exchange -- so an
existing app becomes observable by changing one configuration value and no
code.
"""

from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import InvalidTargetUrlError, NotFoundError
from app.models import Endpoint, Project
from app.services import log_service
from app.utils.validation import join_url, validate_target_url

#: Headers that describe the client-to-gateway hop and must not be relayed.
_DROP_REQUEST_HEADERS = frozenset(
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

#: Response headers that describe the target-to-gateway hop. httpx has
#: already decoded the body, so relaying the original encoding or length
#: would describe bytes we are no longer sending.
_DROP_RESPONSE_HEADERS = frozenset(
    {
        "content-encoding",
        "content-length",
        "transfer-encoding",
        "connection",
        "keep-alive",
    }
)

#: ``{id}`` and ``:id`` are both accepted in a registered endpoint path.
_PARAM_PATTERN = re.compile(r"\{([^}/]+)\}|:([^/]+)")


@dataclass(frozen=True)
class RouteMatch:
    """A resolved route: which endpoint matched, and where it points."""

    endpoint: Endpoint | None
    target_url: str
    #: Captured path parameters, e.g. ``{"id": "42"}``.
    params: dict[str, str]


def normalise_path(path: str) -> str:
    """One leading slash, no trailing slash (except for the root)."""
    cleaned = "/" + path.strip("/")
    return cleaned


def _path_to_regex(path: str) -> tuple[re.Pattern[str], int]:
    """Compile an endpoint path into a matcher plus its parameter count.

    ``/orders/{id}`` becomes ``^/orders/(?P<id>[^/]+)$``. The count is used
    to rank candidates: a route with fewer parameters is more specific.
    """
    params = 0
    parts: list[str] = []
    cursor = 0

    for match in _PARAM_PATTERN.finditer(path):
        parts.append(re.escape(path[cursor : match.start()]))
        name = match.group(1) or match.group(2)
        # Sanitise the name so an odd path cannot produce an invalid group.
        safe = re.sub(r"\W", "_", name) or f"p{params}"
        parts.append(f"(?P<{safe}>[^/]+)")
        params += 1
        cursor = match.end()

    parts.append(re.escape(path[cursor:]))
    return re.compile(f"^{''.join(parts)}$"), params


def _substitute(target: str, params: dict[str, str]) -> str:
    """Fill path parameters into the endpoint's target URL.

    An endpoint registered as ``/orders/{id}`` pointing at
    ``https://api.example.com/orders/{id}`` forwards ``/orders/42`` to
    ``https://api.example.com/orders/42``.
    """
    if not params:
        return target

    def replace(match: re.Match[str]) -> str:
        name = match.group(1) or match.group(2)
        safe = re.sub(r"\W", "_", name) or ""
        return params.get(safe, match.group(0))

    return _PARAM_PATTERN.sub(replace, target)


async def resolve_route(
    session: AsyncSession,
    project: Project,
    method: str,
    path: str,
) -> RouteMatch:
    """Find the endpoint serving ``method path``, or fall back to the base URL.

    Registered endpoints are tried first, most specific first: an exact
    literal path beats a parameterised one, and among parameterised routes
    the one with fewer parameters wins.

    An unmatched path is *not* rejected. If the project has a base URL the
    request is forwarded there and logged without an endpoint attribution,
    because an observability gateway that drops traffic it was not told
    about in advance would hide exactly the calls worth seeing.
    """
    wanted = normalise_path(path)

    result = await session.execute(
        select(Endpoint).where(
            Endpoint.project_id == project.id,
            Endpoint.enabled.is_(True),
            Endpoint.method == method.upper(),
        )
    )
    candidates: list[tuple[int, int, Endpoint, dict[str, str]]] = []

    for endpoint in result.scalars().all():
        pattern, param_count = _path_to_regex(normalise_path(endpoint.path))
        match = pattern.match(wanted)
        if match is None:
            continue
        # Rank: fewer parameters first, then the longer literal path.
        candidates.append(
            (param_count, -len(endpoint.path), endpoint, match.groupdict())
        )

    if candidates:
        candidates.sort(key=lambda item: (item[0], item[1]))
        _, _, endpoint, params = candidates[0]
        target = _substitute(endpoint.target_url, params)
        return RouteMatch(endpoint=endpoint, target_url=target, params=params)

    if project.base_url:
        return RouteMatch(
            endpoint=None,
            target_url=join_url(project.base_url, wanted),
            params={},
        )

    raise NotFoundError(
        f"No enabled endpoint matches {method.upper()} {wanted}, and this "
        "project has no base URL to fall back to."
    )
