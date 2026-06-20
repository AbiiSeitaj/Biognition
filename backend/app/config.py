from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Dr Scan PACS API"
    database_url: str = "sqlite:///./drscan.db"
    storage_dir: Path = Path(__file__).resolve().parent.parent / "storage"
    models_dir: Path = Path(__file__).resolve().parent.parent / "storage" / "models"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:8765"
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
