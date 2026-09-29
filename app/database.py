"""
OpsMind – MongoDB database initialisation and collection accessors.
"""
from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_url)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        _db = get_client()[settings.mongodb_db_name]
    return _db


async def close_db() -> None:
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None


# ── Collection helpers ────────────────────────────────────────────────────────

def incidents_collection():
    return get_db()["incidents"]


def timeline_collection():
    return get_db()["timeline_events"]
