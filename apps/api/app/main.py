from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_settings
from .db import Base, engine
from . import models  # noqa: F401 ensure models are registered on Base metadata
from .routers import (
    applications,
    approvals,
    audit,
    auth,
    businesses,
    checklists,
    documents,
    health,
    impact,
    permissions,
    regulations,
    regulatory_alerts,
    regulatory_changes,
    review,
    rules,
    search,
)

settings = get_settings()

app = FastAPI(
    title="PermitGraph API",
    description=(
        "Open regulatory intelligence & compliance automation infrastructure. "
        "PermitGraph is NOT a government portal, NOT legal advice, and does NOT "
        "replace NSWS/MAITRI/MIDC. See /docs and the repository README for scope "
        "and limitations."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Convenience for local/dev/test runs; production deployments should use
    # scripts/seed_* + a proper migration tool (see docs/architecture).
    Base.metadata.create_all(bind=engine)


for router in (
    health.router,
    auth.router,
    search.router,
    regulations.router,
    rules.router,
    permissions.router,
    approvals.router,
    documents.router,
    regulatory_changes.router,
    impact.router,
    businesses.router,
    applications.router,
    checklists.router,
    regulatory_alerts.router,
    audit.router,
    review.router,
):
    app.include_router(router)

