"""
OpsMind – Hindsight long-term memory integration.

Operations:
  retain  → store resolved incident knowledge
  recall  → find similar past incidents
  reflect → synthesise across multiple memories
"""
from __future__ import annotations

import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

# ── Lazy client init ──────────────────────────────────────────────────────────

_client = None


def _get_client():
    global _client
    if _client is None:
        try:
            from hindsight_client import Hindsight  # type: ignore

            _client = Hindsight(
                base_url=settings.hindsight_api_url,
                api_key=settings.hindsight_api_key if settings.hindsight_api_key else None,
            )
            logger.info("Hindsight client initialised → %s", settings.hindsight_api_url)
        except Exception as exc:
            logger.warning("Hindsight unavailable: %s", exc)
            _client = None
    return _client


# ── Public helpers ────────────────────────────────────────────────────────────

async def retain_incident(content: str) -> bool:
    """Store resolved incident knowledge in Hindsight."""
    client = _get_client()
    if client is None:
        logger.warning("retain skipped – Hindsight unavailable")
        return False
    try:
        client.retain(bank_id=settings.hindsight_bank_id, content=content)
        logger.info("Hindsight RETAIN ✓")
        return True
    except Exception as exc:
        logger.error("Hindsight retain failed: %s", exc)
        return False


async def recall_similar(query: str) -> list[dict[str, Any]]:
    """Search Hindsight for memories similar to the query."""
    client = _get_client()
    if client is None:
        logger.warning("recall skipped – Hindsight unavailable")
        return []
    try:
        results = client.recall(bank_id=settings.hindsight_bank_id, query=query)
        if not results:
            return []
        # Normalise the results into a consistent list-of-dicts
        if isinstance(results, list):
            return [r if isinstance(r, dict) else {"content": str(r)} for r in results]
        if isinstance(results, dict):
            return [results]
        return [{"content": str(results)}]
    except Exception as exc:
        logger.error("Hindsight recall failed: %s", exc)
        return []


async def reflect_on_incidents(query: str) -> str | None:
    """Ask Hindsight to reason over its stored memories."""
    client = _get_client()
    if client is None:
        logger.warning("reflect skipped – Hindsight unavailable")
        return None
    try:
        answer = client.reflect(bank_id=settings.hindsight_bank_id, query=query)
        return str(answer) if answer else None
    except Exception as exc:
        logger.error("Hindsight reflect failed: %s", exc)
        return None
