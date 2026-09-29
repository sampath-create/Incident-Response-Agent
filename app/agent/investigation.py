"""
OpsMind – Agent investigation workflow.

The agent:
  1. Recalls similar incidents from Hindsight
  2. Gathers current evidence (logs, metrics, deployments, runbook)
  3. Asks Gemini to synthesise past + present into a recommendation
  4. After resolution: retains the outcome in Hindsight
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import google.generativeai as genai

from app.config import settings
from app.memory.hindsight import recall_similar, reflect_on_incidents, retain_incident
from app.models import Evidence, Incident, PastIncidentRef
from app.tools.ops import (
    get_current_metrics,
    get_recent_deployments,
    get_recent_logs,
    get_runbook,
)

logger = logging.getLogger(__name__)

# ── Gemini setup ──────────────────────────────────────────────────────────────

def _get_gemini():
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY not set – LLM calls will be skipped.")
        return None
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel(settings.gemini_model)


# ── Core investigation ────────────────────────────────────────────────────────

async def run_investigation(incident: Incident) -> dict:
    """
    Full investigation workflow.
    Returns updated incident fields:
      evidence, past_incidents, agent_recommendation, reflection_summary
    """
    logger.info("🔍 Starting investigation for %s", incident.incident_id)

    # 1. Recall similar incidents from Hindsight
    memory_query = (
        f"service:{incident.service} symptom:{incident.symptom} "
        f"deployment:{incident.deployment or 'unknown'}"
    )
    raw_memories = await recall_similar(memory_query)
    past_incidents = _parse_memory_results(raw_memories)

    # 2. Reflect over all memories for a synthesised summary
    reflection_query = (
        f"Compare all previous incidents for the {incident.service} service "
        f"with this symptom: {incident.symptom}. "
        f"What patterns led to successful resolution and what failed?"
    )
    reflection = await reflect_on_incidents(reflection_query)

    # 3. Gather current evidence from operational tools
    logs_data = await get_recent_logs(incident.service)
    metrics_data = await get_current_metrics(incident.service)
    deployments_data = await get_recent_deployments(incident.service)
    runbook_data = await get_runbook(incident.service, incident.symptom)

    evidence_list = [
        Evidence(
            source="logs",
            summary=f"Error rate: {logs_data['error_rate_pct']}% over last {logs_data['total_entries']} log entries.",
            raw={"error_rate_pct": logs_data["error_rate_pct"]},
        ),
        Evidence(
            source="metrics",
            summary=(
                f"Connection pool: {metrics_data['connection_pool_usage_pct']}% usage "
                f"({metrics_data['active_connections']}/{metrics_data['max_connections']}). "
                f"HTTP 5xx rate: {metrics_data['http_5xx_rate_pct']}%. "
                f"P99 latency: {metrics_data['http_p99_latency_ms']}ms."
            ),
            raw=metrics_data,
        ),
        Evidence(
            source="deployments",
            summary=_summarise_deployments(deployments_data),
            raw=deployments_data,
        ),
        Evidence(
            source="runbook",
            summary=f"Matched runbook: '{runbook_data['runbook']['title']}'.",
            raw=runbook_data,
        ),
    ]

    # 4. Ask Gemini for a recommendation
    recommendation = await _ask_gemini(
        incident=incident,
        past_incidents=past_incidents,
        evidence=evidence_list,
        reflection=reflection,
    )

    return {
        "evidence": evidence_list,
        "past_incidents": past_incidents,
        "agent_recommendation": recommendation,
        "reflection_summary": reflection,
    }


# ── Resolution memory ─────────────────────────────────────────────────────────

async def retain_resolved_incident(incident: Incident) -> bool:
    """Build a rich memory document from a resolved incident and retain it."""
    past_actions = [pi.successful_action for pi in incident.past_incidents if pi.successful_action]
    content = f"""
RESOLVED INCIDENT MEMORY

Incident ID: {incident.incident_id}
Service: {incident.service}
Severity: {incident.severity.value}
Symptom: {incident.symptom}
Deployment: {incident.deployment or "not specified"}

Root Cause: {incident.root_cause}
Successful Action: {incident.resolution_action}
Resolution Notes: {incident.resolution_notes or "none"}

Evidence at resolution:
{_format_evidence_for_memory(incident.evidence)}

Was guided by past incidents: {bool(incident.past_incidents)}
Past successful actions referenced: {", ".join(past_actions) or "none"}

Time to resolve: {incident.time_to_resolve_minutes:.1f} minutes
Resolved at: {incident.resolved_at.isoformat() if incident.resolved_at else "unknown"}
""".strip()

    return await retain_incident(content)


# ── Private helpers ───────────────────────────────────────────────────────────

def _parse_memory_results(raw: list[dict]) -> list[PastIncidentRef]:
    """Convert raw Hindsight recall results to PastIncidentRef objects."""
    refs: list[PastIncidentRef] = []
    for i, item in enumerate(raw[:5]):  # cap at 5 past incidents
        content = item.get("content", item.get("text", str(item)))
        # Heuristic extraction from retained content
        inc_id = _extract_field(content, "Incident ID") or f"PAST-{i + 1}"
        root_cause = _extract_field(content, "Root Cause")
        action = _extract_field(content, "Successful Action")
        refs.append(
            PastIncidentRef(
                incident_id=inc_id,
                similarity_reason=_build_similarity_reason(content),
                root_cause=root_cause,
                successful_action=action,
            )
        )
    return refs


def _extract_field(text: str, label: str) -> str | None:
    for line in text.splitlines():
        if line.strip().startswith(label + ":"):
            value = line.split(":", 1)[-1].strip()
            return value if value else None
    return None


def _build_similarity_reason(content: str) -> str:
    keywords = ["connection pool", "503", "deployment", "rollback", "latency", "timeout"]
    found = [k for k in keywords if k.lower() in content.lower()]
    if found:
        return f"Memory mentions: {', '.join(found[:3])}."
    return "Semantic similarity to current incident."


def _summarise_deployments(data: dict) -> str:
    deployments = data.get("deployments", [])
    if not deployments:
        return "No recent deployments found."
    latest = deployments[0]
    return (
        f"Latest deployment: {latest['version']} at {latest['deployed_at']} "
        f"by {latest['deployed_by']} (status: {latest['status']}, "
        f"{latest['changes']} changes)."
    )


def _format_evidence_for_memory(evidence: list[Evidence]) -> str:
    lines = []
    for e in evidence:
        lines.append(f"  [{e.source.upper()}] {e.summary}")
    return "\n".join(lines) if lines else "  No evidence recorded."


async def _ask_gemini(
    incident: Incident,
    past_incidents: list[PastIncidentRef],
    evidence: list[Evidence],
    reflection: str | None,
) -> str:
    """Call Gemini to synthesise all context into a structured recommendation."""
    model = _get_gemini()
    if model is None:
        return _fallback_recommendation(incident, past_incidents, evidence)

    past_str = ""
    if past_incidents:
        lines = []
        for p in past_incidents:
            lines.append(
                f"  • {p.incident_id}: cause={p.root_cause or 'unknown'}, "
                f"fix={p.successful_action or 'unknown'}"
            )
        past_str = "PAST SIMILAR INCIDENTS:\n" + "\n".join(lines)
    else:
        past_str = "PAST SIMILAR INCIDENTS: None found in memory."

    evidence_str = "\n".join(f"  [{e.source.upper()}] {e.summary}" for e in evidence)

    reflection_str = ""
    if reflection:
        reflection_str = f"\nMEMORY REFLECTION:\n{reflection[:800]}"

    prompt = f"""
You are OpsMind, an expert incident response agent. Analyse this production incident and give a precise, structured recommendation.

INCIDENT:
  ID: {incident.incident_id}
  Service: {incident.service}
  Severity: {incident.severity.value}
  Symptom: {incident.symptom}
  Deployment: {incident.deployment or "unknown"}

CURRENT EVIDENCE:
{evidence_str}

{past_str}
{reflection_str}

Your response must be structured as follows:

**Assessment**
[2-3 sentence assessment of what is likely happening, citing specific evidence]

**Most Likely Root Cause**
[The single most probable root cause based on evidence + memory]

**Recommended Investigation Steps**
1. [Step one]
2. [Step two]
3. [Step three]
4. [Step four]

**Recommended Action**
[The specific action to take – be concrete. E.g., "Roll back to v3.8.1" not just "consider rollback"]

**Confidence**
[High / Medium / Low] – [brief reason]

Keep your response concise and actionable. The engineer is in a live incident.
""".strip()

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as exc:
        logger.error("Gemini call failed: %s", exc)
        return _fallback_recommendation(incident, past_incidents, evidence)


def _fallback_recommendation(
    incident: Incident,
    past_incidents: list[PastIncidentRef],
    evidence: list[Evidence],
) -> str:
    """Fallback when Gemini is unavailable."""
    lines = [
        f"**Assessment**",
        f"Investigating {incident.service} reporting {incident.symptom}.",
        "",
        "**Recommended Investigation Steps**",
        "1. Check connection pool usage.",
        "2. Review recent deployments for connection-management changes.",
        "3. Inspect pod logs for connection leak patterns.",
        "4. Prepare rollback if a deployment is implicated.",
    ]
    if past_incidents:
        lines.insert(2, f"\n*Note: {len(past_incidents)} similar past incident(s) found in memory.*")
    if evidence:
        metrics_ev = next((e for e in evidence if e.source == "metrics"), None)
        if metrics_ev:
            lines.insert(2, f"\n**Key Evidence:** {metrics_ev.summary}")
    return "\n".join(lines)
