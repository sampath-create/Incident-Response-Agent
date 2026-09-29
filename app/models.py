"""
OpsMind – Pydantic models for incidents, timeline events, and API payloads.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from bson import ObjectId
from pydantic import BaseModel, Field, field_serializer, model_validator


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, _info=None):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError(f"Invalid ObjectId: {v!r}")


# ── Enums ─────────────────────────────────────────────────────────────────────

class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    MITIGATED = "mitigated"
    RESOLVED = "resolved"
    POSTMORTEM = "postmortem"


class TimelineEventType(str, Enum):
    ALERT = "alert"
    EVIDENCE = "evidence"
    MEMORY_RECALL = "memory_recall"
    AGENT_ANALYSIS = "agent_analysis"
    ENGINEER_ACTION = "engineer_action"
    STATUS_CHANGE = "status_change"
    RESOLUTION = "resolution"
    MEMORY_STORED = "memory_stored"


# ── Incident ──────────────────────────────────────────────────────────────────

class Evidence(BaseModel):
    """A single piece of evidence gathered during an incident."""
    source: str  # e.g. "logs", "metrics", "deployments"
    summary: str
    raw: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=_now)


class PastIncidentRef(BaseModel):
    """A reference to a similar incident recalled from Hindsight memory."""
    incident_id: str
    similarity_reason: str
    root_cause: str | None = None
    successful_action: str | None = None
    failed_actions: list[str] = Field(default_factory=list)


class Incident(BaseModel):
    """Core incident document stored in MongoDB."""
    id: str | None = Field(default=None, alias="_id")
    incident_id: str  # human-readable, e.g. INC-0001
    service: str
    severity: Severity
    symptom: str
    deployment: str | None = None
    status: IncidentStatus = IncidentStatus.OPEN
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    # Investigation data
    evidence: list[Evidence] = Field(default_factory=list)
    past_incidents: list[PastIncidentRef] = Field(default_factory=list)
    agent_recommendation: str | None = None
    reflection_summary: str | None = None

    # Resolution
    root_cause: str | None = None
    resolution_action: str | None = None
    resolution_notes: str | None = None
    resolved_at: datetime | None = None
    time_to_resolve_minutes: float | None = None

    # Memory
    memory_stored: bool = False

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# ── Timeline Event ────────────────────────────────────────────────────────────

class TimelineEvent(BaseModel):
    """Chronological event in an incident's life."""
    id: str | None = Field(default=None, alias="_id")
    incident_id: str
    event_type: TimelineEventType
    title: str
    description: str
    data: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_now)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# ── API Payloads ──────────────────────────────────────────────────────────────

class CreateIncidentRequest(BaseModel):
    service: str
    severity: Severity
    symptom: str
    deployment: str | None = None


class ResolveIncidentRequest(BaseModel):
    root_cause: str
    resolution_action: str
    resolution_notes: str | None = None


class UpdateStatusRequest(BaseModel):
    status: IncidentStatus


class EngineerActionRequest(BaseModel):
    action: str
    notes: str | None = None


class IncidentResponse(BaseModel):
    """API response – ObjectId converted to string."""
    id: str
    incident_id: str
    service: str
    severity: Severity
    symptom: str
    deployment: str | None = None
    status: IncidentStatus
    created_at: datetime
    updated_at: datetime
    evidence: list[Evidence] = []
    past_incidents: list[PastIncidentRef] = []
    agent_recommendation: str | None = None
    reflection_summary: str | None = None
    root_cause: str | None = None
    resolution_action: str | None = None
    resolution_notes: str | None = None
    resolved_at: datetime | None = None
    time_to_resolve_minutes: float | None = None
    memory_stored: bool = False


class TimelineEventResponse(BaseModel):
    id: str
    incident_id: str
    event_type: TimelineEventType
    title: str
    description: str
    data: dict[str, Any] = {}
    created_at: datetime


class IncidentStats(BaseModel):
    total: int
    open: int
    investigating: int
    mitigated: int
    resolved: int
    critical: int
    high: int
    avg_resolve_minutes: float | None = None
