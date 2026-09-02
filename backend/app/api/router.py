"""Aggregates every resource router under the API prefix."""

from fastapi import APIRouter

from app.api import analytics, endpoints, logs, projects, requests

api_router = APIRouter()

# Order matters: the more specific project sub-resources are registered
# after the project routes themselves, which keeps the generated OpenAPI
# document grouped the way the UI navigation is.
api_router.include_router(projects.router)
api_router.include_router(endpoints.router)
api_router.include_router(requests.router)
api_router.include_router(logs.router)
api_router.include_router(analytics.router)
