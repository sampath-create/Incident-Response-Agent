# OpsMind — Incident Response Agent with Hindsight

> **Remember what happened. Remember what worked. Handle the next incident with that knowledge.**

OpsMind is an incident-response agent that helps engineers investigate production problems by using **Hindsight as long-term memory**.

The main idea is simple:

A normal incident agent starts from the current alert.

OpsMind can also remember:
- similar incidents from the past
- what caused them
- what engineers tried
- what worked
- what failed
- what was learned

That history becomes useful context for the next incident.

---

## Why OpsMind?

Production incidents are rarely completely new.

A team may have already solved the same class of problem months ago, but that knowledge can be spread across logs, tickets, runbooks, and postmortems.

OpsMind connects that history to the next incident.

Instead of asking:

> "What could be causing this error?"

the agent can ask:

> "Have we seen this before, and what actually fixed it?"

---

## Core Workflow

```text
New Alert
   ↓
Create Incident
   ↓
Recall Similar Incidents
   ↓
Check Current Evidence
   ↓
Compare Past + Present
   ↓
Suggest Investigation
   ↓
Engineer Takes Action
   ↓
Observe Result
   ↓
Store What Happened
   ↓
Future Incidents Get Better Context
```

The important part is the last step.

**The result of today's incident becomes useful memory for tomorrow.**

---

## What Hindsight Does

Hindsight is the long-term memory layer.

The application mainly uses three operations:

```text
RETAIN  → store useful incident knowledge
RECALL  → find related past knowledge
REFLECT → reason over multiple memories
```

### Simple example

After an incident:

```text
Incident:
Payment API returned many 503 errors.

Root cause:
Connection leak after deployment v3.8.2.

Action:
Rollback v3.8.2.

Result:
Service recovered.
```

OpsMind retains that experience.

Later, when a similar incident happens:

```text
Current incident:
Payment API is returning 503s after deployment.
```

The agent can recall:

```text
A previous incident had:
- the same service
- similar symptoms
- a similar deployment
- connection-pool exhaustion

Rollback fixed that incident.
```

That is the main value of Hindsight in this project.

---

## Architecture

```text
                   ┌──────────────────┐
                   │      Engineer    │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │   OpsMind API    │
                   │     FastAPI      │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │   Agent Layer    │
                   │ Investigation +  │
                   │ Decision Flow    │
                   └──────┬─────┬─────┘
                          │     │
                ┌─────────┘     └─────────┐
                ▼                         ▼
       ┌─────────────────┐       ┌─────────────────┐
       │    Hindsight    │       │ Operational Tools│
       │                 │       │                 │
       │ retain          │       │ Logs            │
       │ recall          │       │ Metrics         │
       │ reflect         │       │ Deployments     │
       │                 │       │ Runbooks        │
       └────────┬────────┘       └────────┬────────┘
                │                         │
                └──────────┬──────────────┘
                           ▼
                  ┌──────────────────┐
                  │   LLM Reasoning  │
                  │ Evidence + Plan  │
                  └────────┬─────────┘
                           ▼
                  ┌──────────────────┐
                  │ Incident Outcome │
                  └────────┬─────────┘
                           │
                           ▼
                       Hindsight
```

### Main parts

| Part | Job |
|---|---|
| Frontend | Shows incidents, evidence, history, and recommendations |
| FastAPI | Handles API requests |
| Agent | Controls the investigation workflow |
| Hindsight | Stores and recalls long-term incident knowledge |
| LLM | Summarizes evidence and helps reason about the incident |
| Tools | Read logs, metrics, deployments, and runbooks |
| Database | Stores current incident state |

---

## Incident Workflow

### 1. Incident starts

An alert arrives:

```json
{
  "service": "payment-api",
  "severity": "high",
  "symptom": "HTTP 503 spike",
  "deployment": "v3.8.2"
}
```

---

### 2. OpsMind remembers

The agent asks Hindsight:

```text
Find previous incidents with similar symptoms,
service, deployment, or root cause.
```

Possible result:

```text
Incident INC-1047

Cause:
Connection leak

Attempted:
- restart
- increase pool size
- rollback

Successful action:
Rollback
```

---

### 3. OpsMind checks current evidence

The agent then checks current systems:

```text
Current logs
Current metrics
Recent deployments
Service dependencies
Runbooks
```

Example:

```text
Current connection usage: 100%
Recent deployment: v3.8.2
503 rate: 31%
```

Now the agent has:

```text
PAST EXPERIENCE
        +
CURRENT EVIDENCE
```

---

### 4. Agent creates an investigation plan

Instead of guessing, it can say:

```text
The current incident matches INC-1047 closely.

Next checks:
1. Inspect connection usage by pod.
2. Compare the current deployment with the previous version.
3. Check for connection leaks.
4. Prepare rollback if the leak is confirmed.
```

The engineer remains in control of the final action.

---

### 5. The incident is resolved

Suppose the engineer confirms a connection leak and rolls back.

The system records:

```text
Root cause:
Connection leak after deployment.

Action:
Rollback.

Result:
Service recovered.
```

---

### 6. The experience becomes memory

The final outcome is retained in Hindsight.

```text
Incident
   ↓
Investigation
   ↓
Root Cause
   ↓
Action
   ↓
Outcome
   ↓
Hindsight Memory
```

The next incident can use that experience.

---

## Memory Workflow

This is the most important workflow in OpsMind.

```text
        ┌─────────────────┐
        │ Incident #101   │
        └────────┬────────┘
                 ▼
          What happened?
                 ▼
          What did we try?
                 ▼
          What worked?
                 ▼
          What failed?
                 ▼
          RETAIN in Hindsight
                 │
                 │
                 ▼
        ┌─────────────────┐
        │ Incident #125   │
        └────────┬────────┘
                 ▼
        RECALL Incident #101
                 ▼
       Compare with current data
                 ▼
       Investigate from experience
                 ▼
       RETAIN the new outcome
```

This creates a continuous learning loop without retraining the model.

---

## What We Store

We do **not** need to store every raw log line in long-term memory.

Instead, memory focuses on useful knowledge:

```text
Incident summary
Root cause
Important evidence
Actions attempted
Successful actions
Failed actions
Resolution
Postmortem lessons
```

Raw logs can remain in the normal logging system.

This keeps Hindsight focused on knowledge that can help future investigations.

---

## Before vs After Hindsight

### Without long-term memory

```text
Engineer:
Payment API is returning 503s after a deployment.

Agent:
Check logs, database health, network, dependencies,
connection pools, and the recent deployment.
```

Generic advice.

### With Hindsight

```text
Engineer:
Payment API is returning 503s after a deployment.

Agent:
I found a previous incident with the same service,
deployment pattern, and connection-pool exhaustion.

That incident was resolved by rollback.

Current telemetry also shows full connection-pool usage.

I recommend checking the connection lifecycle first.
```

The important change is not the wording.

**The investigation starts from previous experience.**

---

## Example Hindsight Integration

A simplified integration looks like this:

```python
# Save a resolved incident
memory.retain(
    bank_id="opsmind-production",
    content=incident_summary,
)
```

Recall related incidents:

```python
results = memory.recall(
    bank_id="opsmind-production",
    query=memory_query,
)
```

Reason over several memories:

```python
answer = memory.reflect(
    bank_id="opsmind-production",
    query="Compare the relevant incidents and explain what worked.",
)
```

The exact client configuration depends on whether Hindsight is self-hosted or used as a managed service.

---

## Suggested Project Structure

```text
opsmind/
├── app/
│   ├── api/
│   │   └── incidents.py
│   ├── agent/
│   │   ├── graph.py
│   │   └── state.py
│   ├── memory/
│   │   ├── hindsight.py
│   │   ├── queries.py
│   │   └── retention.py
│   ├── tools/
│   │   ├── logs.py
│   │   ├── metrics.py
│   │   └── deployments.py
│   └── config.py
│
├── frontend/
├── tests/
├── scripts/
├── .env.example
├── pyproject.toml
└── README.md
```

The important separation is:

```text
Current incident state → Database

Historical experience → Hindsight

Current evidence      → Operational tools

Reasoning             → Agent + LLM
```

---

## Local Setup

### 1. Clone

```bash
git clone <your-repository-url>
cd opsmind
```

### 2. Create environment

```bash
python -m venv .venv
```

Activate it:

```bash
# Linux / macOS
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create `.env`:

```env
LLM_API_KEY=<your-key>

HINDSIGHT_API_URL=<your-hindsight-url>
HINDSIGHT_API_KEY=<your-key>

DATABASE_URL=<your-database-url>
```

### 5. Start the API

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Production Safety

Incident systems can perform sensitive operations, so the agent should not freely execute production changes.

### Read operations

Usually safe:

```text
Search logs
Read metrics
Check deployments
Read runbooks
Recall incidents
```

### Write operations

Require approval or policy:

```text
Rollback
Restart service
Change configuration
Scale infrastructure
Terminate processes
```

A good default workflow is:

```text
Agent recommends
      ↓
Engineer reviews
      ↓
Engineer approves
      ↓
Action executes
      ↓
Result is observed
      ↓
Outcome is remembered
```

---

## Reliability

Hindsight should improve incident investigation without becoming a single point of failure.

If memory is unavailable:

```text
Hindsight unavailable
       ↓
Log the failure
       ↓
Continue with current evidence
       ↓
Agent clearly states that historical context is unavailable
```

An outage in the memory layer should reduce context, not prevent engineers from creating or investigating incidents.

---

## Roadmap

### Phase 1
- Incident ingestion
- Hindsight memory
- Similar incident recall
- Incident dashboard

### Phase 2
- Real log and metric integrations
- Deployment history
- Runbook retrieval
- Evidence tracing

### Phase 3
- Postmortem learning
- Better incident pattern detection
- Outcome-aware recommendations

### Phase 4
- Approval workflows
- Controlled remediation
- Audit logs
- Enterprise access controls

---

## Key Design Principle

OpsMind is built around one idea:

> **Do not just remember what happened. Remember what worked.**

A useful incident memory looks like this:

```text
Symptom
  ↓
Evidence
  ↓
Root Cause
  ↓
Action
  ↓
Outcome
  ↓
Lesson
```

That is the information we want to carry from one incident to the next.

---

## Resources

- [Hindsight GitHub repository](https://github.com/vectorize-io/hindsight)
- [Hindsight documentation](https://hindsight.vectorize.io/)
- [Vectorize agent memory](https://vectorize.io/what-is-agent-memory)

---

## License

Add your chosen project license here.
