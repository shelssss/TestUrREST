"""Project routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Response, status

from app.api.deps import SessionDep
from app.schemas.project import (
    ProjectCreate,
    ProjectRead,
    ProjectSummary,
    ProjectUpdate,
)
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectSummary], summary="List all projects")
async def list_projects(session: SessionDep) -> list[ProjectSummary]:
    return await project_service.list_projects(session)


@router.post(
    "",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project",
)
async def create_project(payload: ProjectCreate, session: SessionDep) -> ProjectRead:
    project = await project_service.create_project(session, payload)
    return ProjectRead.model_validate(project)


@router.get("/{project_id}", response_model=ProjectRead, summary="Get a project")
async def get_project(project_id: uuid.UUID, session: SessionDep) -> ProjectRead:
    project = await project_service.get_project(session, project_id)
    return ProjectRead.model_validate(project)


@router.put("/{project_id}", response_model=ProjectRead, summary="Update a project")
async def update_project(
    project_id: uuid.UUID, payload: ProjectUpdate, session: SessionDep
) -> ProjectRead:
    project = await project_service.update_project(session, project_id, payload)
    return ProjectRead.model_validate(project)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete a project and all of its data",
)
async def delete_project(project_id: uuid.UUID, session: SessionDep) -> Response:
    await project_service.delete_project(session, project_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
