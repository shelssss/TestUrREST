"""Target URL validation, including the SSRF guard."""

import pytest

from app.core.config import settings
from app.core.errors import InvalidTargetUrlError
from app.utils.validation import join_url, validate_target_url


@pytest.fixture
def strict(monkeypatch):
    """Turn the private-network guard back on (conftest relaxes it)."""
    monkeypatch.setattr(settings, "block_private_network_targets", True)


@pytest.fixture
def relaxed(monkeypatch):
    monkeypatch.setattr(settings, "block_private_network_targets", False)


def test_public_https_url_is_accepted(relaxed) -> None:
    assert validate_target_url("https://api.example.com/orders") == (
        "https://api.example.com/orders"
    )


def test_fragment_is_dropped(relaxed) -> None:
    assert validate_target_url("https://api.example.com/a#frag") == (
        "https://api.example.com/a"
    )


def test_query_string_is_preserved(relaxed) -> None:
    assert validate_target_url("https://api.example.com/a?b=1") == (
        "https://api.example.com/a?b=1"
    )


@pytest.mark.parametrize(
    "url",
    ["", "   ", "ftp://files.example.com", "file:///etc/passwd", "https://"],
)
def test_malformed_urls_are_rejected(url, relaxed) -> None:
    with pytest.raises(InvalidTargetUrlError):
        validate_target_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost:8000/admin",
        "http://127.0.0.1/admin",
        "http://10.0.0.5/internal",
        "http://192.168.1.1/router",
        "http://169.254.169.254/latest/meta-data/",   # cloud metadata
        "http://[::1]/admin",
    ],
)
def test_internal_targets_are_blocked(url, strict) -> None:
    """The proxy must not become a door into the private network."""
    with pytest.raises(InvalidTargetUrlError):
        validate_target_url(url)


def test_internal_targets_are_allowed_when_explicitly_unblocked(relaxed) -> None:
    assert validate_target_url("http://127.0.0.1:9000/x").startswith("http://127.0.0.1")


def test_join_url_combines_base_and_path() -> None:
    assert join_url("https://api.example.com", "/orders") == "https://api.example.com/orders"
    assert join_url("https://api.example.com/", "orders") == "https://api.example.com/orders"


def test_absolute_path_overrides_the_base() -> None:
    assert join_url("https://api.example.com", "https://other.example.com/x") == (
        "https://other.example.com/x"
    )


def test_join_url_without_a_base_returns_the_path() -> None:
    assert join_url(None, "https://api.example.com/x") == "https://api.example.com/x"
