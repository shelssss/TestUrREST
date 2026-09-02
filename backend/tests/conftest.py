"""Test fixtures.

Tests run against SQLite so the suite needs no database server. The models
avoid PostgreSQL-only constructs (JSONB is declared as a variant of JSON,
enums as VARCHAR + CHECK), so the same schema builds on both.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
# Tests point at 127.0.0.1 stubs, so the private-network guard is relaxed
# here. It has its own dedicated tests in test_validation.py.
os.environ.setdefault("BLOCK_PRIVATE_NETWORK_TARGETS", "false")

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.database.database import get_session
from app.main import app
from app.models import Base


@pytest_asyncio.fixture
async def engine() -> AsyncIterator[object]:
    """A fresh in-memory database per test.

    StaticPool keeps every connection pointed at the same in-memory
    database; without it each connection would get its own empty one.
    """
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield test_engine
    await test_engine.dispose()


@pytest_asyncio.fixture
async def session(engine) -> AsyncIterator[AsyncSession]:
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as db:
        yield db


@pytest_asyncio.fixture
async def client(engine) -> AsyncIterator[AsyncClient]:
    """An HTTP client bound to the app, with the DB dependency overridden."""
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async def _override() -> AsyncIterator[AsyncSession]:
        async with factory() as db:
            yield db

    app.dependency_overrides[get_session] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as http:
        yield http
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def project(client: AsyncClient) -> dict:
    """A saved project the other tests can hang data off."""
    response = await client.post(
        "/api/projects",
        json={
            "name": "eBay",
            "description": "Marketplace API",
            "environment": "production",
            "base_url": "https://api.example.com",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()
