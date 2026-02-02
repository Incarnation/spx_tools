from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # When running locally, we typically run from repo root or from backend/.
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_file_encoding="utf-8")

    app_env: str = "local"
    log_level: str = "INFO"
    tz: str = "America/New_York"

    database_url: str

    tradier_base_url: str = "https://sandbox.tradier.com/v1"
    tradier_access_token: str
    tradier_account_id: str

    snapshot_interval_minutes: int = 5
    snapshot_underlying: str = "SPX"
    snapshot_dte_targets: str = "3,5,7"
    snapshot_dte_tolerance_days: int = 1

    cors_origins: str = "http://localhost:5173"

    # Testing/ops controls
    allow_snapshot_outside_rth: bool = False
    admin_api_key: str | None = None

    def dte_targets_list(self) -> list[int]:
        parts = [p.strip() for p in self.snapshot_dte_targets.split(",") if p.strip()]
        return [int(p) for p in parts]

    def cors_origins_list(self) -> list[str]:
        parts = [p.strip() for p in self.cors_origins.split(",") if p.strip()]
        return parts


settings = Settings()

