"""Initial schema: projects, endpoints, request_logs

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

import app.models.base

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

#: JSONB on PostgreSQL, plain JSON elsewhere -- matches the model definition.
JSON_TYPE = sa.JSON().with_variant(
    postgresql.JSONB(astext_type=sa.Text()), "postgresql"
)


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "environment",
            sa.Enum(
                "development",
                "staging",
                "production",
                name="environment",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("base_url", sa.String(length=2048), nullable=True),
        sa.Column(
            "created_at",
            app.models.base.UTCDateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            app.models.base.UTCDateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_projects")),
    )
    op.create_index(op.f("ix_projects_name"), "projects", ["name"], unique=True)

    op.create_table(
        "endpoints",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column(
            "method",
            sa.Enum(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "HEAD",
                "OPTIONS",
                name="http_method",
                native_enum=False,
                length=10,
            ),
            nullable=False,
        ),
        sa.Column("path", sa.String(length=1024), nullable=False),
        sa.Column("target_url", sa.String(length=2048), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            app.models.base.UTCDateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            app.models.base.UTCDateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_endpoints_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_endpoints")),
        sa.UniqueConstraint(
            "project_id", "method", "path", name="project_method_path"
        ),
    )
    op.create_index(
        op.f("ix_endpoints_project_id"), "endpoints", ["project_id"], unique=False
    )

    op.create_table(
        "request_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("request_id", sa.String(length=32), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("endpoint_id", sa.Uuid(), nullable=True),
        sa.Column("method", sa.String(length=10), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("request_headers", JSON_TYPE, nullable=False),
        sa.Column("query_parameters", JSON_TYPE, nullable=False),
        sa.Column("request_body", sa.Text(), nullable=True),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("response_headers", JSON_TYPE, nullable=True),
        sa.Column("response_body", sa.Text(), nullable=True),
        sa.Column("response_time_ms", sa.Integer(), nullable=False),
        sa.Column("response_size", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("client_ip", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            app.models.base.UTCDateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        # Logs outlive the endpoint they came from: deleting an endpoint
        # nulls the link instead of destroying the project's history.
        sa.ForeignKeyConstraint(
            ["endpoint_id"],
            ["endpoints.id"],
            name=op.f("fk_request_logs_endpoint_id_endpoints"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_request_logs_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_request_logs")),
    )

    # Single-column indexes for the individual filters...
    op.create_index(
        op.f("ix_request_logs_created_at"), "request_logs", ["created_at"]
    )
    op.create_index(
        op.f("ix_request_logs_endpoint_id"), "request_logs", ["endpoint_id"]
    )
    op.create_index(op.f("ix_request_logs_method"), "request_logs", ["method"])
    op.create_index(
        op.f("ix_request_logs_project_id"), "request_logs", ["project_id"]
    )
    op.create_index(
        op.f("ix_request_logs_request_id"), "request_logs", ["request_id"], unique=True
    )
    op.create_index(
        op.f("ix_request_logs_status_code"), "request_logs", ["status_code"]
    )

    # ...and composites for the queries the app actually issues: a project's
    # logs newest-first, its logs filtered by status, and one endpoint's
    # history. These are what keep the logs page fast as the table grows.
    op.create_index(
        "ix_request_logs_project_id_created_at",
        "request_logs",
        ["project_id", "created_at"],
    )
    op.create_index(
        "ix_request_logs_project_id_status_code",
        "request_logs",
        ["project_id", "status_code"],
    )
    op.create_index(
        "ix_request_logs_endpoint_id_created_at",
        "request_logs",
        ["endpoint_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_table("request_logs")
    op.drop_table("endpoints")
    op.drop_table("projects")
