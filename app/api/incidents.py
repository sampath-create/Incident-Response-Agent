"""
OpsMind – FastAPI incident router.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.agent.investigation import retain_resolved_incident, run_investigation
from app.database import incidents_collection, timeline_collection
from app.models import (
    CreateIncidentRequest,
    EngineerActionRequest,
    Incident,
    IncidentResponse,
    IncidentStats,
    IncidentStatus,
    ResolveIncidentRequest,
    TimelineEvent,
    TimelineEventResponse,
    TimelineEventType,
    UpdateStatusRequest,
)

router = APIRouter(prefix="/api/incidents", tags=["incidents"])
logger = logging.getLogger(__name__)

# ── Counter helper ────────────────────────────────────────────────────────────

async def _next_incident_id() -> str:
    col = incidents_collection()
    count = await col.count_documents({})
    return f"INC-{count + 1:04d}"


# ── Serialisation helper ──────────────────────────────────────────────────────

def _doc_to_response(doc: dict) -> IncidentResponse:
    doc["id"] = str(doc.pop("_id", ""))
    return IncidentResponse(**doc)


def _event_to_response(doc: dict) -> TimelineEventResponse:
    doc["id"] = str(doc.pop("_id", ""))
    return TimelineEventResponse(**doc)


async def _add_event(
    incident_id: str,
    event_type: TimelineEventType,
    title: str,
    description: str,
    data: dict | None = None,
) -> None:
    event = TimelineEvent(
        incident_id=incident_id,
        event_type=event_type,
        title=title,
        description=description,
        data=data or {},
    )
    await timeline_collection().insert_one(event.model_dump(exclude={"id"}))


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=IncidentStats)
async def get_stats():
    """Return aggregate statistics across all incidents."""
    col = incidents_collection()
    total = await col.count_documents({})

    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    status_counts: dict[str, int] = {}
    async for doc in col.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]

    sev_pipeline = [
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
    ]
    sev_counts: dict[str, int] = {}
    async for doc in col.aggregate(sev_pipeline):
        sev_counts[doc["_id"]] = doc["count"]

    avg_pipeline = [
        {"$match": {"time_to_resolve_minutes": {"$ne": None}}},
        {"$group": {"_id": None, "avg": {"$avg": "$time_to_resolve_minutes"}}},
    ]
    avg_resolve = None
    async for doc in col.aggregate(avg_pipeline):
        avg_resolve = round(doc["avg"], 1)

    return IncidentStats(
        total=total,
        open=status_counts.get("open", 0),
        investigating=status_counts.get("investigating", 0),
        mitigated=status_counts.get("mitigated", 0),
        resolved=status_counts.get("resolved", 0) + status_counts.get("postmortem", 0),
        critical=sev_counts.get("critical", 0),
        high=sev_counts.get("high", 0),
        avg_resolve_minutes=avg_resolve,
    )


@router.post("", response_model=IncidentResponse, status_code=201)
async def create_incident(body: CreateIncidentRequest, bg: BackgroundTasks):
    """Create a new incident and kick off an investigation in the background."""
    incident_id = await _next_incident_id()
    incident = Incident(
        incident_id=incident_id,
        service=body.service,
        severity=body.severity,
        symptom=body.symptom,
        deployment=body.deployment,
        status=IncidentStatus.INVESTIGATING,
    )
    doc = incident.model_dump(exclude={"id"})
    result = await incidents_collection().insert_one(doc)
    inserted_id = result.inserted_id

    # Timeline event
    await _add_event(
        incident_id,
        TimelineEventType.ALERT,
        "Incident Created",
        f"New {body.severity.value} incident for {body.service}: {body.symptom}",
        {"service": body.service, "severity": body.severity.value, "deployment": body.deployment},
    )

    # Run investigation asynchronously
    bg.add_task(_background_investigate, str(inserted_id), incident_id, incident)

    raw = await incidents_collection().find_one({"_id": inserted_id})
    return _doc_to_response(raw)


async def _background_investigate(db_id: str, incident_id: str, incident: Incident):
    """Background task: run agent investigation and update the incident doc."""
    try:
        result = await run_investigation(incident)

        # Serialise evidence and past_incidents for MongoDB
        update_data: dict[str, Any] = {
            "status": IncidentStatus.INVESTIGATING.value,
            "updated_at": datetime.now(timezone.utc),
            "evidence": [e.model_dump() for e in result["evidence"]],
            "past_incidents": [p.model_dump() for p in result["past_incidents"]],
            "agent_recommendation": result["agent_recommendation"],
            "reflection_summary": result["reflection_summary"],
        }
        await incidents_collection().update_one(
            {"_id": ObjectId(db_id)}, {"$set": update_data}
        )

        # Timeline events
        if result["past_incidents"]:
            await _add_event(
                incident_id,
                TimelineEventType.MEMORY_RECALL,
                f"Recalled {len(result['past_incidents'])} Similar Incident(s)",
                "Hindsight returned past incidents matching this pattern.",
                {"count": len(result["past_incidents"])},
            )

        await _add_event(
            incident_id,
            TimelineEventType.AGENT_ANALYSIS,
            "Agent Investigation Complete",
            "Evidence gathered and recommendation generated.",
            {"evidence_count": len(result["evidence"])},
        )
    except Exception as exc:
        logger.error("Background investigation failed for %s: %s", incident_id, exc)


@router.get("", response_model=list[IncidentResponse])
async def list_incidents(
    status: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
):
    """List incidents with optional filters."""
    filt: dict = {}
    if status:
        filt["status"] = status
    if severity:
        filt["severity"] = severity

    cursor = incidents_collection().find(filt).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [_doc_to_response(d) for d in docs]


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: str):
    """Get a single incident by its human-readable ID."""
    doc = await incidents_collection().find_one({"incident_id": incident_id})
    if not doc:
        raise HTTPException(404, f"Incident {incident_id} not found")
    return _doc_to_response(doc)


@router.post("/{incident_id}/investigate", response_model=IncidentResponse)
async def trigger_investigation(incident_id: str, bg: BackgroundTasks):
    """Re-run or manually trigger an agent investigation for an incident."""
    doc = await incidents_collection().find_one({"incident_id": incident_id})
    if not doc:
        raise HTTPException(404, f"Incident {incident_id} not found")

    incident = Incident(id=str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"})
    await incidents_collection().update_one(
        {"incident_id": incident_id},
        {"$set": {"status": IncidentStatus.INVESTIGATING.value, "updated_at": datetime.now(timezone.utc)}}
    )
    await _add_event(
        incident_id,
        TimelineEventType.AGENT_ANALYSIS,
        "Investigation Triggered",
        "Agent is querying Hindsight memory and analyzing live telemetry data.",
    )

    bg.add_task(_background_investigate, str(doc["_id"]), incident_id, incident)
    raw = await incidents_collection().find_one({"incident_id": incident_id})
    return _doc_to_response(raw)



@router.patch("/{incident_id}/status", response_model=IncidentResponse)
async def update_status(incident_id: str, body: UpdateStatusRequest):
    """Update the status of an incident."""
    doc = await incidents_collection().find_one({"incident_id": incident_id})
    if not doc:
        raise HTTPException(404, f"Incident {incident_id} not found")

    await incidents_collection().update_one(
        {"incident_id": incident_id},
        {"$set": {"status": body.status.value, "updated_at": datetime.now(timezone.utc)}},
    )
    await _add_event(
        incident_id,
        TimelineEventType.STATUS_CHANGE,
        f"Status → {body.status.value.title()}",
        f"Incident status updated to {body.status.value}.",
    )
    raw = await incidents_collection().find_one({"incident_id": incident_id})
    return _doc_to_response(raw)


@router.post("/{incident_id}/action", response_model=IncidentResponse)
async def log_engineer_action(incident_id: str, body: EngineerActionRequest):
    """Record an action taken by an engineer."""
    doc = await incidents_collection().find_one({"incident_id": incident_id})
    if not doc:
        raise HTTPException(404, f"Incident {incident_id} not found")

    await incidents_collection().update_one(
        {"incident_id": incident_id},
        {"$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    await _add_event(
        incident_id,
        TimelineEventType.ENGINEER_ACTION,
        f"Engineer Action: {body.action[:60]}",
        body.notes or body.action,
        {"action": body.action},
    )
    raw = await incidents_collection().find_one({"incident_id": incident_id})
    return _doc_to_response(raw)


@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(incident_id: str, body: ResolveIncidentRequest, bg: BackgroundTasks):
    """Resolve an incident and store the experience in Hindsight memory."""
    doc = await incidents_collection().find_one({"incident_id": incident_id})
    if not doc:
        raise HTTPException(404, f"Incident {incident_id} not found")

    now = datetime.now(timezone.utc)
    created_at = doc.get("created_at", now)
    ttm = (now - created_at).total_seconds() / 60 if isinstance(created_at, datetime) else None

    update = {
        "status": IncidentStatus.RESOLVED.value,
        "root_cause": body.root_cause,
        "resolution_action": body.resolution_action,
        "resolution_notes": body.resolution_notes,
        "resolved_at": now,
        "time_to_resolve_minutes": ttm,
        "updated_at": now,
    }
    await incidents_collection().update_one({"incident_id": incident_id}, {"$set": update})

    await _add_event(
        incident_id,
        TimelineEventType.RESOLUTION,
        "Incident Resolved",
        f"Root cause: {body.root_cause}. Action: {body.resolution_action}.",
        {"root_cause": body.root_cause, "action": body.resolution_action},
    )

    # Store in Hindsight memory asynchronously
    raw = await incidents_collection().find_one({"incident_id": incident_id})
    resolved_incident = Incident(id=str(raw["_id"]), **{k: v for k, v in raw.items() if k != "_id"})
    bg.add_task(_background_retain, resolved_incident)

    return _doc_to_response(raw)


async def _background_retain(incident: Incident):
    try:
        stored = await retain_resolved_incident(incident)
        if stored:
            await incidents_collection().update_one(
                {"incident_id": incident.incident_id},
                {"$set": {"memory_stored": True}},
            )
            await _add_event(
                incident.incident_id,
                TimelineEventType.MEMORY_STORED,
                "Experience Saved to Hindsight",
                "This incident's root cause and resolution have been retained in long-term memory.",
            )
    except Exception as exc:
        logger.error("Background retain failed for %s: %s", incident.incident_id, exc)


@router.get("/{incident_id}/timeline", response_model=list[TimelineEventResponse])
async def get_timeline(incident_id: str):
    """Get the full chronological timeline for an incident."""
    cursor = (
        timeline_collection()
        .find({"incident_id": incident_id})
        .sort("created_at", 1)
    )
    docs = await cursor.to_list(length=500)
    return [_event_to_response(d) for d in docs]
