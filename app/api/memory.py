"""
OpsMind – Memory & Knowledge API router.
Enables querying, reflecting, retaining, and seeding Hindsight long-term memories.
"""
from __future__ import annotations

import logging
from typing import Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.memory.hindsight import recall_similar, reflect_on_incidents, retain_incident
from app.database import incidents_collection

router = APIRouter(prefix="/api/memory", tags=["memory"])
logger = logging.getLogger(__name__)


class RetainMemoryRequest(BaseModel):
    content: str = Field(..., description="Incident postmortem or knowledge text to retain")


class ReflectMemoryRequest(BaseModel):
    query: str = Field(..., description="Query or operational question to reflect on")


@router.get("/search")
async def search_memory(q: str):
    """Recall similar incident memories from Hindsight."""
    if not q:
        raise HTTPException(400, "Query parameter 'q' is required")
    results = await recall_similar(q)
    return {"query": q, "count": len(results), "results": results}


@router.post("/reflect")
async def reflect_memory(body: ReflectMemoryRequest):
    """Synthesise and reflect across long-term incident memories."""
    answer = await reflect_on_incidents(body.query)
    return {"query": body.query, "reflection": answer or "No reflections generated or Hindsight offline."}


@router.post("/retain")
async def retain_memory(body: RetainMemoryRequest):
    """Manually retain knowledge into Hindsight long-term memory."""
    success = await retain_incident(body.content)
    return {"status": "success" if success else "failed", "retained": success}


@router.post("/seed-playbooks")
async def seed_playbooks():
    """Seed Hindsight memory with curated historical postmortems and playbooks."""
    sample_postmortems = [
        """INCIDENT POSTMORTEM: INC-0010
Service: checkout-service
Date: 2026-06-15
Symptom: High 500 error rate (18%) during flash sale, checkout timeout spikes.
Root Cause: HikariCP database connection pool exhaustion caused by unindexed product inventory lookup query locking connections under high concurrency.
Resolution: Scaled connection pool maxLifetime from 30s to 60s, increased maxPoolSize from 20 to 50, added composite index on `(product_id, warehouse_id, status)` in Postgres.
Learnings: Never run unindexed inventory count queries inside transactional checkout blocks.""",

        """INCIDENT POSTMORTEM: INC-0011
Service: auth-service
Date: 2026-07-22
Symptom: Intermittent JWT validation failures and 401 Unauthorized errors across all downstream microservices.
Root Cause: JWKS (JSON Web Key Set) public key caching layer in Redis failed to refresh after secret rotation due to Redis TTL bug.
Resolution: Flushed Redis JWKS cache key `auth:jwks:keyset`, updated auth-service JWKS cache retry backoff policy to gracefully fetch public keys on verification mismatch.
Learnings: Ensure asymmetric key rotation runs dual-key validity overlap for at least 24 hours before retiring old keys.""",

        """INCIDENT POSTMORTEM: INC-0012
Service: payment-gateway
Date: 2026-08-03
Symptom: Stripe webhook processing queue backed up with 14,000 pending messages, transaction confirmation delay > 12 minutes.
Root Cause: Deadlock on idempotent webhook ledger table caused by concurrent duplicate event delivery without row-level lock ordering.
Resolution: Added optimistic locking with Redis distributed lock key `lock:webhook:<event_id>` before DB transaction entry; scaled Celery worker concurrency from 8 to 24.
Learnings: In-memory distributed lock with 15s TTL prevents DB thread lock contention on concurrent webhook retries.""",

        """INCIDENT POSTMORTEM: INC-0013
Service: search-indexer
Date: 2026-08-29
Symptom: Elasticsearch cluster CPU at 99%, search latency degraded from 45ms to 2800ms.
Root Cause: Wildcard regex query on unanalyzed text fields triggered by third-party scraper bot burst.
Resolution: Rate-limited client IP ranges, disabled leading-wildcard queries in SearchQueryParser, scaled Elasticsearch data nodes from 3 to 6.
Learnings: Enforce strict query validation and rate limits at Cloudflare edge before queries hit search backend."""
    ]

    retained_count = 0
    for doc in sample_postmortems:
        ok = await retain_incident(doc)
        if ok:
            retained_count += 1

    return {
        "status": "completed",
        "total_seeded": len(sample_postmortems),
        "retained_successfully": retained_count,
    }
