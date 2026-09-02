"""URL validation and target-safety checks for the proxy.

The proxy forwards user-supplied URLs from the server, so an unvalidated
target lets a caller reach anything the backend container can reach --
cloud metadata endpoints, the database, other internal services. Every
target therefore has to pass ``validate_target_url`` before a request is
built, and the private-range block can only be relaxed deliberately via
``BLOCK_PRIVATE_NETWORK_TARGETS=false`` for local development.
"""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlsplit, urlunsplit

from app.core.config import settings
from app.core.errors import InvalidTargetUrlError

ALLOWED_SCHEMES = frozenset({"http", "https"})

#: Hostnames that always resolve back to the machine running the backend.
_LOOPBACK_NAMES = frozenset({"localhost", "localhost.localdomain", "ip6-localhost"})


def normalise_optional_base_url(value: str | None) -> str | None:
    """Validate a project's optional base URL, returning ``None`` if blank.

    Base URLs are stored, not fetched, so this only checks shape -- the
    network-level checks happen when a request is actually sent.
    """
    if value is None:
        return None
    cleaned = value.strip().rstrip("/")
    if not cleaned:
        return None
    parts = urlsplit(cleaned)
    if parts.scheme not in ALLOWED_SCHEMES:
        raise ValueError("Base URL must start with http:// or https://")
    if not parts.netloc:
        raise ValueError("Base URL must include a host, e.g. https://api.example.com")
    return cleaned


def normalise_target_url(value: str) -> str:
    """Validate a required target URL's shape (used by endpoint schemas)."""
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Target URL is required")
    parts = urlsplit(cleaned)
    if parts.scheme not in ALLOWED_SCHEMES:
        raise ValueError("Target URL must start with http:// or https://")
    if not parts.netloc:
        raise ValueError("Target URL must include a host, e.g. https://api.example.com")
    return cleaned


def join_url(base: str | None, path: str) -> str:
    """Join a project base URL with an endpoint path.

    An absolute ``path`` wins outright, so an endpoint can point somewhere
    other than its project's base URL.
    """
    candidate = path.strip()
    if urlsplit(candidate).scheme in ALLOWED_SCHEMES:
        return candidate
    if not base:
        return candidate
    return f"{base.rstrip('/')}/{candidate.lstrip('/')}"


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """True for any address that is not a routable public destination."""
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _resolve(host: str) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """Resolve ``host`` to every address it maps to."""
    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise InvalidTargetUrlError(f"Could not resolve host '{host}'") from exc
    addresses = []
    for info in infos:
        try:
            addresses.append(ipaddress.ip_address(info[4][0]))
        except ValueError:  # pragma: no cover - defensive
            continue
    return addresses


def validate_target_url(url: str) -> str:
    """Return a safe, normalised absolute URL or raise ``InvalidTargetUrlError``.

    Checks, in order: the URL parses, uses http(s), names a host, and --
    unless private targets are explicitly allowed -- resolves only to public
    addresses. *Every* resolved address must be public, so a hostname with
    both a public and an internal A record is rejected.
    """
    cleaned = (url or "").strip()
    if not cleaned:
        raise InvalidTargetUrlError("A target URL is required")

    try:
        parts = urlsplit(cleaned)
    except ValueError as exc:
        raise InvalidTargetUrlError("Target URL is malformed") from exc

    if parts.scheme not in ALLOWED_SCHEMES:
        raise InvalidTargetUrlError(
            "Target URL must use http:// or https://"
        )
    if not parts.hostname:
        raise InvalidTargetUrlError("Target URL must include a host")

    if parts.port is not None:
        try:
            port = parts.port
        except ValueError as exc:
            raise InvalidTargetUrlError("Target URL has an invalid port") from exc
        if not 1 <= port <= 65535:
            raise InvalidTargetUrlError("Target URL has an invalid port")

    if settings.block_private_network_targets:
        host = parts.hostname.lower().strip("[]")
        if host in _LOOPBACK_NAMES:
            raise InvalidTargetUrlError(
                "Requests to localhost are not allowed"
            )
        try:
            literal = ipaddress.ip_address(host)
        except ValueError:
            literal = None

        addresses = [literal] if literal is not None else _resolve(host)
        if not addresses:
            raise InvalidTargetUrlError(f"Could not resolve host '{host}'")
        if any(_is_blocked_ip(ip) for ip in addresses):
            raise InvalidTargetUrlError(
                "Requests to private or loopback addresses are not allowed"
            )

    # Drop any fragment: it is a client-side construct and never sent.
    return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ""))
