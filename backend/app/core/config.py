from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "interio-engine"
    environment: str = "development"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3-flash"
    weather_api_key: str = ""
    world_bank_base_url: str = "https://api.worldbank.org/v2"
    world_bank_timeout_sec: int = 8
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )

    project_root: Path = Path(__file__).resolve().parents[2]
    generated_dir: Path = Path(__file__).resolve().parents[1] / "data" / "generated"
    material_db_path: Path = (
        Path(__file__).resolve().parents[1] / "data" / "materials_india.json"
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.generated_dir.mkdir(parents=True, exist_ok=True)
    return settings
