from pathlib import Path

from pydantic_settings import BaseSettings


DEFAULT_STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage"


class Settings(BaseSettings):
    app_name: str = "Dr Scan PACS API"
    database_url: str = "sqlite:///./drscan.db"
    storage_dir: Path = DEFAULT_STORAGE_DIR
    models_dir: Path = DEFAULT_STORAGE_DIR / "models"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    high_risk_threshold: float = 0.65
    ai_confidence_threshold: float = 0.35
    ai_device: str = "cpu"  # cuda when GPU available

    class Config:
        env_file = ".env"


settings = Settings()
settings.storage_dir.mkdir(parents=True, exist_ok=True)
settings.models_dir.mkdir(parents=True, exist_ok=True)
(settings.storage_dir / "dicom").mkdir(exist_ok=True)
(settings.storage_dir / "overlays").mkdir(exist_ok=True)
(settings.storage_dir / "thumbnails").mkdir(exist_ok=True)
