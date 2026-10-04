from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "PermitGraph API"
    environment: str = os.environ.get("PERMITGRAPH_ENV", "development")
    database_url: str = os.environ.get(
        "DATABASE_URL", "sqlite:///./permitgraph_dev.db"
    )
    secret_key: str = os.environ.get(
        "PERMITGRAPH_SECRET_KEY", "dev-only-insecure-secret-change-me"
    )
    access_token_expire_minutes: int = 60 * 8
    storage_backend: str = os.environ.get("STORAGE_BACKEND", "local")  # local | s3
    local_storage_dir: str = os.environ.get("LOCAL_STORAGE_DIR", "./var/uploads")
    s3_endpoint_url: str | None = os.environ.get("S3_ENDPOINT_URL")
    s3_bucket: str = os.environ.get("S3_BUCKET", "permitgraph-documents")
    s3_access_key: str | None = os.environ.get("S3_ACCESS_KEY")
    s3_secret_key: str | None = os.environ.get("S3_SECRET_KEY")
    max_upload_size_mb: int = 20
    allowed_upload_extensions: tuple[str, ...] = (".pdf", ".png", ".jpg", ".jpeg")
    cors_allow_origins: list[str] = ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
