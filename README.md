# OpsMind — Incident Response Agent with Hindsight

> **Remember what happened. Remember what worked. Handle the next incident with that knowledge.**

OpsMind is an AI-powered incident-response copilot that helps SRE and platform engineering teams triage, investigate, and resolve production outages by using **Hindsight as long-term memory**.

---

## ⚡ Why OpsMind?

Production outages are rarely completely unique. Teams frequently run into similar classes of incidents (database pool exhaustions, token expiry bugs, deadlocks, bad rollouts), but past solutions are buried across Slack threads, Jira postmortems, and fragmented runbooks.

**OpsMind closes the loop:**
1. **Live Alert Triaging**: Correlates live logs, metrics, deployments, and runbooks.
2. **Hindsight Long-Term Memory Recall**: Searches historical postmortems for matching symptoms and verified mitigations.
3. **Cross-Memory Reflection**: Synthesises patterns across previous outages with Google Gemini.
4. **Instant Action Execution**: Provides one-click remediation actions and live chronological timeline tracking.
5. **Resolution Retain**: Automatically indexes root causes, mitigation actions, and postmortem learnings back into Hindsight for the future.

---

## 🏗️ Architecture

```
                                  ┌────────────────────────┐
                                  │   Hindsight Memory     │
                                  │ (Retain/Recall/Reflect)│
                                  └───────────┬────────────┘
                                              │
┌─────────────────────────┐       ┌───────────▼────────────┐       ┌────────────────────────┐
│  React 19 + Vite UI     │ <───> │  FastAPI Backend Core  │ <───> │  Google Gemini Model   │
│  (Tailored Dark Theme)  │       │  (Async Python Engine) │       │  (Root Cause Synthesis)│
└─────────────────────────┘       └───────────┬────────────┘       └────────────────────────┘
                                              │
                                  ┌───────────▼────────────┐
                                  │  MongoDB Database      │
                                  │  (Incidents & Timeline)│
                                  └────────────────────────┘
```

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd opsmind

# Copy and customize environment variables
cp .env.example .env

# Install dependencies with uv or pip
uv pip install -e .

# Run the FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API docs are available at: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

### 2. Frontend Setup

```bash
cd opsmind/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at: [http://localhost:5173](http://localhost:5173)

---

## 🧠 Hindsight Memory Workflows

### 1. Recall (Find similar past incidents)
When an alert triggers (e.g. `500 error spike in checkout-service`), OpsMind queries Hindsight's vector index to surface past postmortems with matching failure modes and what actions were successful vs what failed.

### 2. Reflect (Synthesize historical lessons)
Ask cross-incident questions such as *"Why do our database connection pool incidents happen during flash sales?"* to extract architectural takeaways.

### 3. Retain (Save resolved incidents)
When an engineer marks an incident as resolved, OpsMind packages the root cause, solution, and preventative notes into structured memory documents retained inside the Hindsight memory bank.
