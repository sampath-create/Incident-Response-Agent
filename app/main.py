"""
OpsMind – FastAPI application entry point.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.incidents import router as incidents_router
from app.api.memory import router as memory_router
from app.config import settings
from app.database import close_db, get_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)

app = FastAPI(
    title="OpsMind API",
    description="Incident Response Agent with Hindsight long-term memory",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lifecycle ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    db = get_db()
    # Ensure indexes
    await db["incidents"].create_index("incident_id", unique=True)
    await db["incidents"].create_index("service")
    await db["incidents"].create_index("status")
    await db["incidents"].create_index("created_at")
    await db["timeline_events"].create_index("incident_id")
    logging.getLogger(__name__).info("OpsMind API started ✓")


@app.on_event("shutdown")
async def shutdown():
    await close_db()


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(incidents_router)
app.include_router(memory_router)



# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "opsmind-api", "version": "0.1.0"}
