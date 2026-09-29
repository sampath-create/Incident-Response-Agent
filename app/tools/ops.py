"""
OpsMind – Simulated operational tools.

These tools represent the read-only data sources an incident agent would
query in production.  In a real deployment each function would call actual
observability APIs (Datadog, Grafana, GitHub, PagerDuty, etc.).
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone


# ── Logs tool ─────────────────────────────────────────────────────────────────

async def get_recent_logs(service: str, limit: int = 20) -> dict:
    """Return simulated recent log entries for a service."""
    levels = ["INFO", "WARN", "ERROR", "ERROR", "WARN", "INFO"]
    messages = [
        f"Request completed in {random.randint(50, 3000)}ms",
        "Connection pool nearing limit",
        "Failed to acquire connection from pool",
        f"HTTP 503 returned to client (attempt {random.randint(1, 5)})",
        "Health check endpoint responded 200",
        "Database query timeout after 5000ms",
        "Retrying request (circuit open)",
        "Memory usage at 87%",
        "Graceful shutdown initiated",
        "Worker thread exited unexpectedly",
    ]
    now = datetime.now(timezone.utc)
    entries = []
    for i in range(limit):
        entries.append({
            "timestamp": (now - timedelta(seconds=i * 6)).isoformat(),
            "level": random.choice(levels),
            "service": service,
            "message": random.choice(messages),
            "pod": f"{service}-pod-{random.randint(1, 6)}",
        })
    return {
        "service": service,
        "total_entries": limit,
        "error_rate_pct": round(random.uniform(15, 45), 1),
        "entries": entries,
    }


# ── Metrics tool ──────────────────────────────────────────────────────────────

async def get_current_metrics(service: str) -> dict:
    """Return simulated current metric snapshot for a service."""
    return {
        "service": service,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "http_5xx_rate_pct": round(random.uniform(20, 50), 1),
        "http_p99_latency_ms": random.randint(800, 4000),
        "connection_pool_usage_pct": random.randint(85, 100),
        "active_connections": random.randint(480, 512),
        "max_connections": 512,
        "cpu_usage_pct": round(random.uniform(60, 95), 1),
        "memory_usage_pct": round(random.uniform(70, 92), 1),
        "pod_count": random.randint(3, 8),
        "pod_restarts_last_hour": random.randint(0, 5),
    }


# ── Deployments tool ──────────────────────────────────────────────────────────

async def get_recent_deployments(service: str, limit: int = 5) -> dict:
    """Return simulated recent deployment history for a service."""
    now = datetime.now(timezone.utc)
    versions = ["v3.8.0", "v3.8.1", "v3.8.2", "v3.8.3", "v3.9.0-rc1"]
    statuses = ["success", "success", "success", "rollback", "success"]
    deployments = []
    for i, (ver, status) in enumerate(zip(reversed(versions), reversed(statuses))):
        deployments.append({
            "version": ver,
            "deployed_at": (now - timedelta(hours=i * 8 + 1)).isoformat(),
            "deployed_by": random.choice(["ci-pipeline", "sampath", "vivek"]),
            "status": status,
            "duration_seconds": random.randint(90, 300),
            "changes": random.randint(3, 25),
        })
    return {
        "service": service,
        "deployments": deployments[:limit],
    }


# ── Runbooks tool ─────────────────────────────────────────────────────────────

async def get_runbook(service: str, symptom: str) -> dict:
    """Return the most relevant runbook for a given service + symptom."""
    runbooks = {
        "connection_pool": {
            "title": "Connection Pool Exhaustion Runbook",
            "steps": [
                "1. Identify the service and check current pool usage via metrics.",
                "2. Check for connection leaks — look for unclosed connections in logs.",
                "3. Review recent deployments for connection-management changes.",
                "4. Attempt to increase pool size (temporary mitigation).",
                "5. If leak confirmed, roll back the offending deployment.",
                "6. Monitor pool usage to confirm recovery.",
                "7. File a postmortem ticket and schedule a code review.",
            ],
            "tags": ["connection", "503", "pool"],
        },
        "high_latency": {
            "title": "High Latency Runbook",
            "steps": [
                "1. Check p99 latency trend — sudden spike vs. gradual increase.",
                "2. Correlate with deployment timeline.",
                "3. Review DB query plans for slow queries.",
                "4. Check downstream dependency health.",
                "5. Review CPU / memory saturation.",
            ],
            "tags": ["latency", "performance"],
        },
        "default": {
            "title": f"General {service} Troubleshooting Runbook",
            "steps": [
                "1. Check service logs for error patterns.",
                "2. Review current metrics — CPU, memory, connections.",
                "3. Check recent deployments for changes.",
                "4. Verify downstream dependencies are healthy.",
                "5. Escalate to on-call engineer if unresolved in 30 minutes.",
            ],
            "tags": ["general"],
        },
    }
    # Simple keyword matching
    key = "default"
    if any(k in symptom.lower() for k in ["503", "connection", "pool"]):
        key = "connection_pool"
    elif any(k in symptom.lower() for k in ["latency", "slow", "timeout"]):
        key = "high_latency"

    return {"service": service, "symptom": symptom, "runbook": runbooks[key]}
