"""Application error types and the handlers that render them.

Every error leaves the API in the same shape so the frontend only has to
understand one thing:

    {"detail": "Project not found"}

Validation failures add a machine-readable ``errors`` list alongside it.
Internal exceptions are logged server-side and reported as a generic
message -- Python tracebacks never reach the client.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base class for errors that are safe to show to the user."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    detail: str = "Request could not be processed"

    def __init__(self, detail: str | None = None) -> None:
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    detail = "Resource not found"


class ProjectNotFoundError(NotFoundError):
    detail = "Project not found"


class EndpointNotFoundError(NotFoundError):
    detail = "Endpoint not found"


class LogNotFoundError(NotFoundError):
    detail = "Request log not found"


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    detail = "Resource already exists"


class ValidationError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    detail = "Invalid request"


class InvalidTargetUrlError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    detail = "Invalid target URL"


class TargetTimeoutError(AppError):
    status_code = status.HTTP_504_GATEWAY_TIMEOUT
    detail = "The target API did not respond in time"


class TargetUnavailableError(AppError):
    status_code = status.HTTP_502_BAD_GATEWAY
    detail = "The target API could not be reached"


def _json(status_code: int, detail: str, **extra: object) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail, **extra})


def register_exception_handlers(app: FastAPI) -> None:
    """Attach the handlers that normalise every error response."""

    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return _json(exc.status_code, exc.detail)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return _json(exc.status_code, detail)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Flatten Pydantic's error list into {field, message} pairs the UI
        # can attach to individual form inputs.
        errors = [
            {
                "field": ".".join(str(part) for part in err["loc"][1:]) or "body",
                "message": err["msg"],
            }
            for err in exc.errors()
        ]
        first = errors[0]["message"] if errors else "Invalid request"
        return _json(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Validation failed: {first}",
            errors=errors,
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return _json(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "An internal error occurred. Please try again.",
        )
