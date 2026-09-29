"""
OpsMind – Application Configuration
Loads from .env / environment variables.
"""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-pro"

    # Hindsight
    hindsight_api_url: str = "https://api.hindsight.vectorize.io"
    hindsight_api_key: str = ""
    hindsight_bank_id: str = "opsmind-production"

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "opsmind"

    # App
    app_env: str = "development"
    app_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
