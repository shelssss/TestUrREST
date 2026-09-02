"""Redaction of sensitive values before anything is written to the database.

The platform stores full request and response headers so developers can
debug real traffic. Credentials must not be part of that record: they are
replaced at the point of capture, so a plaintext token never reaches
PostgreSQL in the first place. Redaction is therefore not reversible and
there is no "reveal" path in the API.
"""

from __future__ import annotations

import re

MASK = "********"

#: Headers whose entire value is a credential.
SENSITIVE_HEADERS = frozenset(
    {
        "authorization",
        "proxy-authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "api-key",
        "x-auth-token",
        "x-access-token",
        "x-refresh-token",
        "x-csrf-token",
        "x-session-token",
        "authentication",
    }
)

#: Query/body keys that commonly carry secrets.
SENSITIVE_KEY_PATTERN = re.compile(
    r"(password|passwd|secret|token|api[-_]?key|access[-_]?key|"
    r"private[-_]?key|client[-_]?secret|credential|authorization|session[-_]?id)",
    re.IGNORECASE,
)


def redact_header_value(name: str, value: str) -> str:
    """Mask a header value, keeping the scheme so the shape stays readable.

    ``Bearer eyJhbGci...`` becomes ``Bearer ********`` -- enough to see what
    kind of auth was used without exposing the credential itself.
    """
    if name.lower() not in SENSITIVE_HEADERS:
        return value
    scheme, _, rest = value.partition(" ")
    if rest and scheme.lower() in {"bearer", "basic", "digest", "token", "apikey"}:
        return f"{scheme} {MASK}"
    return MASK


def redact_headers(headers: dict[str, str] | None) -> dict[str, str]:
    """Return a copy of ``headers`` with credential values masked."""
    if not headers:
        return {}
    return {name: redact_header_value(name, value) for name, value in headers.items()}


def redact_params(params: dict[str, str] | None) -> dict[str, str]:
    """Mask query parameters whose key looks like a secret."""
    if not params:
        return {}
    return {
        key: (MASK if SENSITIVE_KEY_PATTERN.search(key) else value)
        for key, value in params.items()
    }


def redact_json_body(value: object, _depth: int = 0) -> object:
    """Recursively mask secret-looking keys inside a decoded JSON body."""
    if _depth > 12:  # guard against pathologically nested payloads
        return value
    if isinstance(value, dict):
        return {
            key: (
                MASK
                if isinstance(key, str) and SENSITIVE_KEY_PATTERN.search(key)
                else redact_json_body(item, _depth + 1)
            )
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [redact_json_body(item, _depth + 1) for item in value]
    return value
