"""The proxy route -- where the API Explorer sends its requests."""

from __future__ import annotations

import uuid

from fastapi import APIRouter

from app.api.deps import ClientInfoDep, SessionDep
from app.schemas.request import ProxyRequest, ProxyResponse
from app.services import proxy_service

router = APIRouter(prefix="/projects/{project_id}/requests", tags=["requests"])


@router.post(
    "",
    response_model=ProxyResponse,
    summary="Send a request through the platform and log it",
    response_description=(
        "The captured response. A target that timed out or refused the "
        "connection still returns 200 here, with a null status_code and an "
        "error message -- the failure is data, not an API error."
    ),
)
async def send_request(
    project_id: uuid.UUID,
    payload: ProxyRequest,
    session: SessionDep,
    client: ClientInfoDep,
) -> ProxyResponse:
    return await proxy_service.send_request(
        session,
        project_id,
        payload,
        client_ip=client.ip,
        user_agent=client.user_agent,
    )
