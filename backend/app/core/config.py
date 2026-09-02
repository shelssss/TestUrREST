"""Application configuration, loaded from the environment."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings. Every value can be overridden with an env var."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "API Management Platform"
    api_prefix: str = "/api"
    debug: bool = False

    # Defaults to SQLite so a fresh clone runs with no configuration and no
    # database server. Production uses PostgreSQL, which is what the schema
    # and the aggregation queries are designed for:
    #   postgresql+asyncpg://user:password@host:port/database
    database_url: str = "sqlite+aiosqlite:///./apim.db"

    # Origins allowed to call the API (the Vite dev server by default).
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # --- Proxy behaviour -------------------------------------------------
    # Seconds to wait for a target API before giving up.
    proxy_timeout_seconds: float = 30.0
    # Hard ceiling a user may request per-call.
    proxy_max_timeout_seconds: float = 120.0
    # Response bodies larger than this are truncated before being logged,
    # so a single large download cannot bloat the database.
    max_logged_body_bytes: int = 64 * 1024
    # Refuse to proxy to loopback / link-local / private addresses.
    block_private_network_targets: bool = True

    # --- Log retention ---------------------------------------------------
    default_log_page_size: int = 50
    max_log_page_size: int = 200


@lru_cache
def get_settings() -> Settings:
    """Settings are read once and cached for the process lifetime."""
    return Settings()


settings = get_settings()
