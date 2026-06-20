from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import departments, studies
from app.seed import seed_demo_data

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_demo_data()
    from app.services.ml.registry import model_catalog

    logger.info("AI models registered: %s", [m["modality"] for m in model_catalog()])
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
# Tailscale / LAN: allow any origin without credentials for shared Docker demos.
tailscale_mode = os.getenv("TAILSCALE") == "1"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if tailscale_mode else origins,
    allow_credentials=not tailscale_mode,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(studies.router, prefix="/api")
app.include_router(departments.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "dr-scan-api"}


@app.get("/api/models")
def list_models():
    from app.services.ml.registry import model_catalog

    return {"models": model_catalog()}
