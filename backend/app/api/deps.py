"""Shared FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_session

SessionDep = Annotated[AsyncSession, Depends(get_session)]


class ClientInfo:
    """The caller's IP and user agent, recorded on every proxied request."""

    def __init__(self, ip: str | None, user_agent: str | None) -> None:
        self.ip = ip
        self.user_agent = user_agent


def get_client_info(request: Request) -> ClientInfo:
    """Extract the caller's identity from the incoming request.

    ``X-Forwarded-For`` is honoured because the app is expected to run
    behind a reverse proxy; only the first hop is kept.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else None

    user_agent = request.headers.get("user-agent")
    if user_agent and len(user_agent) > 512:
        user_agent = user_agent[:512]

    return ClientInfo(ip=ip, user_agent=user_agent)


ClientInfoDep = Annotated[ClientInfo, Depends(get_client_info)]
