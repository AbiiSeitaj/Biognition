from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.migrate import run_migrations
from app.routers import analytics, auth, departments, pacs, studies, teams, workflow
from app.seed import seed_demo_data, seed_followup_studies, seed_pacs_infrastructure, seed_team_data, seed_users

logger = logging.getLogger(__name__)

API_ROUTERS = [auth.router, studies.router, analytics.router, departments.router, teams.router, pacs.router, workflow.router]


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations()
    seed_users()
    seed_pacs_infrastructure()
    seed_demo_data()
    seed_followup_studies()
    seed_team_data()
    from app.services.ml.registry import model_catalog

    logger.info("AI models registered: %s", [m["modality"] for m in model_catalog()])
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
tailscale_mode = os.getenv("TAILSCALE") == "1"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if tailscale_mode else origins,
    allow_credentials=not tailscale_mode,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in API_ROUTERS:
    app.include_router(router, prefix="/api")

# Tailscale Serve and some gateways strip the /api prefix before forwarding.
for router in API_ROUTERS:
    app.include_router(router)


@app.get("/api/health")
@app.get("/health")
def health():
    return {"status": "ok", "service": "biognition-api"}


@app.get("/api/models")
@app.get("/models")
def list_models():
    from app.services.ml.registry import model_catalog

    return {"models": model_catalog()}
