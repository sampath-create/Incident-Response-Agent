import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Brain,
  Sparkles,
  RefreshCw,
  Zap,
  Terminal,
  FileText,
  Activity,
  GitCommit,
  BookOpen,
  Send,
  Loader2,
  HelpCircle,
  TrendingDown,
  Layers,
  ChevronDown,
  Cpu,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import {
  getIncident,
  getTimeline,
  triggerInvestigation,
  updateStatus,
  logAction,
} from '../api';
import { formatDate, getSeverityBadgeClass, getStatusBadgeClass } from '../utils';
import ResolveModal from '../components/ResolveModal';
import toast from 'react-hot-toast';

export default function IncidentDetail() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState('logs');
  const [actionInput, setActionInput] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchIncidentData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [inc, tl] = await Promise.all([getIncident(id), getTimeline(id)]);
      setIncident(inc);
      setTimeline(tl);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load incident details');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentData();
    const interval = setInterval(() => {
      fetchIncidentData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleTriggerInvestigation = async () => {
    try {
      setInvestigating(true);
      await triggerInvestigation(id);
      toast.success('AI Investigation started! Querying Hindsight memory and live tools...');
      setTimeout(() => {
        fetchIncidentData(true);
        setInvestigating(false);
      }, 4000);
    } catch (err) {
      toast.error('Failed to trigger investigation');
      setInvestigating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const updated = await updateStatus(id, newStatus);
      setIncident(updated);
      toast.success(`Status changed to ${newStatus}`);
      fetchIncidentData(true);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleLogAction = async (e) => {
    e.preventDefault();
    if (!actionInput.trim()) return;

    try {
      setSubmittingAction(true);
      await logAction(id, {
        action: actionInput.trim(),
        notes: actionNotes.trim() || undefined,
      });
      toast.success('Engineer action recorded to timeline');
      setActionInput('');
      setActionNotes('');
      fetchIncidentData(true);
    } catch {
      toast.error('Failed to log engineer action');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleQuickRemediation = async (actionText, notes) => {
    try {
      setSubmittingAction(true);
      await logAction(id, { action: actionText, notes });
      toast.success(`Executed: ${actionText}`);
      fetchIncidentData(true);
    } catch {
      toast.error('Failed to execute remediation action');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading && !incident) {
    return (
      <div className="p-16 text-center text-muted">
        <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-accent" />
        <p className="text-sm">Loading incident details & telemetry...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-base font-semibold text-primary">Incident not found</h3>
        <Link to="/" className="btn btn-primary btn-sm mt-4 inline-flex items-center gap-1">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  // Parse evidence pieces
  const logsEvidence = incident.evidence?.find((e) => e.source === 'logs')?.content || '';
  const metricsEvidence = incident.evidence?.find((e) => e.source === 'metrics')?.content || '';
  const deploymentEvidence = incident.evidence?.find((e) => e.source === 'deployments')?.content || '';
  const runbookEvidence = incident.evidence?.find((e) => e.source === 'runbook')?.content || '';

  const hasPastIncidents = incident.past_incidents && incident.past_incidents.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs text-muted hover:text-primary flex items-center gap-1">
              <ArrowLeft size={14} /> Incidents
            </Link>
            <span className="text-xs text-muted">/</span>
            <span className="font-mono text-xs font-bold text-accent">{incident.incident_id}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-primary">{incident.service}</h1>
            <span className={`badge ${getSeverityBadgeClass(incident.severity)}`}>
              {incident.severity.toUpperCase()}
            </span>
            <span className={`badge ${getStatusBadgeClass(incident.status)}`}>
              {incident.status.toUpperCase()}
            </span>
            {incident.deployment && (
              <span className="text-xs font-mono text-muted bg-subtle px-2 py-0.5 rounded border border-border">
                {incident.deployment}
              </span>
            )}
          </div>

          <p className="text-sm text-secondary">{incident.symptom}</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleTriggerInvestigation}
            disabled={investigating}
            className="btn btn-secondary btn-sm flex items-center gap-1-5"
            title="Query Hindsight memory and pull live logs, metrics, runbooks"
          >
            <Sparkles size={14} className={`text-accent ${investigating ? 'animate-spin' : ''}`} />
            <span>{investigating ? 'Investigating...' : 'Re-investigate'}</span>
          </button>

          {/* Status Dropdown */}
          <select
            value={incident.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="form-select text-xs py-1.5 px-3 bg-subtle"
          >
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="mitigated">Mitigated</option>
            <option value="resolved">Resolved</option>
            <option value="postmortem">Postmortem</option>
          </select>

          {incident.status !== 'resolved' && (
            <button
              onClick={() => setResolveModalOpen(true)}
              className="btn btn-success btn-sm flex items-center gap-1-5"
              id="btn-open-resolve"
            >
              <Brain size={15} />
              <span>Resolve & Retain</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI & Evidence (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Agent Recommendation Card */}
          <div className="card border-accent/40 bg-gradient-to-br from-card to-card/70">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="icon-badge icon-badge-accent">
                  <Brain size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-primary">
                    Agent Investigation & Root Cause Synthesis
                  </h2>
                  <p className="text-[11px] text-muted">
                    Synthesised with Hindsight Memory + Gemini AI Copilot
                  </p>
                </div>
              </div>
              <span className="badge badge-accent text-[10px]">Active Analysis</span>
            </div>

            <div className="p-5 space-y-4">
              {incident.agent_recommendation ? (
                <div className="prose prose-invert text-sm leading-relaxed whitespace-pre-wrap text-primary">
                  {incident.agent_recommendation}
                </div>
              ) : (
                <div className="text-center py-6 text-muted">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2 text-accent" />
                  <p className="text-xs">
                    Investigation in progress... gathering telemetry and querying Hindsight memories.
                  </p>
                </div>
              )}

              {/* Quick Remediation Actions */}
              <div className="pt-3 border-t border-border">
                <div className="text-xs font-semibold text-muted mb-2 flex items-center gap-1">
                  <Zap size={13} className="text-accent" /> RECOMMENDED ACTIONS:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      handleQuickRemediation(
                        'Scaled database connection pool maxPoolSize: 20 → 50',
                        'Applied based on Hindsight INC-0010 resolution'
                      )
                    }
                    disabled={submittingAction}
                    className="btn btn-secondary btn-sm text-xs flex items-center gap-1 hover:border-accent"
                  >
                    <Activity size={13} className="text-accent" /> Scale DB Connection Pool (50)
                  </button>
                  <button
                    onClick={() =>
                      handleQuickRemediation(
                        'Flushed Redis cache keyset: auth:jwks:keyset',
                        'Cleared stale JWKS cache following asymmetric key rotation mismatch'
                      )
                    }
                    disabled={submittingAction}
                    className="btn btn-secondary btn-sm text-xs flex items-center gap-1 hover:border-accent"
                  >
                    <RotateCcw size={13} className="text-accent" /> Flush Redis JWKS Cache
                  </button>
                  <button
                    onClick={() =>
                      handleQuickRemediation(
                        `Rollback deployment ${incident.deployment || 'current'} → previous stable`,
                        'Triggered rollback to mitigate active 500 error spike'
                      )
                    }
                    disabled={submittingAction}
                    className="btn btn-secondary btn-sm text-xs flex items-center gap-1 hover:border-danger"
                  >
                    <GitCommit size={13} className="text-danger" /> Rollback Deployment
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hindsight Memory Recall Panel */}
          <div className="card">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="icon-badge icon-badge-accent">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primary">
                    Hindsight Long-Term Memory Recall
                  </h3>
                  <p className="text-[11px] text-muted">
                    Past incidents with similar symptoms, root causes, and verified fixes
                  </p>
                </div>
              </div>
              <span className="badge badge-subtle text-[11px]">
                {incident.past_incidents?.length || 0} matches
              </span>
            </div>

            <div className="p-4 space-y-3">
              {hasPastIncidents ? (
                incident.past_incidents.map((past, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-border bg-subtle space-y-2 hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent">
                          {past.incident_id}
                        </span>
                        <span className="text-xs font-semibold text-primary">
                          {past.service}
                        </span>
                        {past.similarity_score && (
                          <span className="badge badge-accent text-[10px]">
                            {Math.round(past.similarity_score * 100)}% match
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted">{past.resolved_date || 'Past Incident'}</span>
                    </div>

                    <div className="text-xs text-secondary">
                      <span className="font-semibold text-primary">Root Cause: </span>
                      {past.root_cause}
                    </div>

                    <div className="text-xs text-success bg-success/10 p-2 rounded border border-success/20">
                      <span className="font-semibold">What Worked: </span>
                      {past.what_worked || past.resolution_action}
                    </div>

                    {past.what_failed && (
                      <div className="text-xs text-danger bg-danger/10 p-2 rounded border border-danger/20">
                        <span className="font-semibold">What Failed: </span>
                        {past.what_failed}
                      </div>
                    )}

                    {past.learnings && (
                      <div className="text-[11px] text-muted italic">
                        💡 Key takeaway: {past.learnings}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted">
                  <Brain size={24} className="mx-auto mb-2 text-muted" />
                  <p className="text-xs">
                    No matching past incidents found in Hindsight for this exact symptom yet.
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    Once resolved, this incident will be retained in long-term memory for next time!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Evidence Explorer (Logs, Metrics, Deployments, Runbooks) */}
          <div className="card">
            <div className="border-b border-border flex items-center justify-between px-4">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveEvidenceTab('logs')}
                  className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeEvidenceTab === 'logs'
                      ? 'border-accent text-accent font-semibold'
                      : 'border-transparent text-muted hover:text-primary'
                  }`}
                >
                  <Terminal size={14} /> Live Logs
                </button>
                <button
                  onClick={() => setActiveEvidenceTab('metrics')}
                  className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeEvidenceTab === 'metrics'
                      ? 'border-accent text-accent font-semibold'
                      : 'border-transparent text-muted hover:text-primary'
                  }`}
                >
                  <Activity size={14} /> Telemetry & Metrics
                </button>
                <button
                  onClick={() => setActiveEvidenceTab('deployments')}
                  className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeEvidenceTab === 'deployments'
                      ? 'border-accent text-accent font-semibold'
                      : 'border-transparent text-muted hover:text-primary'
                  }`}
                >
                  <GitCommit size={14} /> Deployments
                </button>
                <button
                  onClick={() => setActiveEvidenceTab('runbook')}
                  className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeEvidenceTab === 'runbook'
                      ? 'border-accent text-accent font-semibold'
                      : 'border-transparent text-muted hover:text-primary'
                  }`}
                >
                  <BookOpen size={14} /> Runbook
                </button>
              </div>
            </div>

            <div className="p-4">
              {activeEvidenceTab === 'logs' && (
                <div className="code-block font-mono text-xs overflow-x-auto max-h-72 p-3 bg-black/40 rounded border border-border leading-relaxed text-secondary whitespace-pre-wrap">
                  {logsEvidence || 'No logs captured.'}
                </div>
              )}

              {activeEvidenceTab === 'metrics' && (
                <div className="code-block font-mono text-xs overflow-x-auto max-h-72 p-3 bg-black/40 rounded border border-border leading-relaxed text-secondary whitespace-pre-wrap">
                  {metricsEvidence || 'No metric points captured.'}
                </div>
              )}

              {activeEvidenceTab === 'deployments' && (
                <div className="code-block font-mono text-xs overflow-x-auto max-h-72 p-3 bg-black/40 rounded border border-border leading-relaxed text-secondary whitespace-pre-wrap">
                  {deploymentEvidence || 'No deployment events detected.'}
                </div>
              )}

              {activeEvidenceTab === 'runbook' && (
                <div className="prose prose-invert text-xs max-h-72 overflow-y-auto p-3 bg-subtle rounded border border-border whitespace-pre-wrap leading-relaxed">
                  {runbookEvidence || 'No standard runbook attached.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Timeline & Action Logger (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Timeline Card */}
          <div className="card">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="icon-badge icon-badge-subtle">
                  <Clock size={16} />
                </div>
                <h3 className="text-sm font-semibold text-primary">Incident Timeline</h3>
              </div>
              <span className="badge badge-subtle text-[10px]">
                {timeline.length} events
              </span>
            </div>

            <div className="p-4 max-h-[480px] overflow-y-auto">
              {timeline.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">No timeline events recorded.</p>
              ) : (
                <div className="timeline">
                  {timeline.map((event, idx) => {
                    const isMemory =
                      event.event_type === 'memory_recall' ||
                      event.event_type === 'memory_stored';
                    const isResolution = event.event_type === 'resolution';
                    const isAction = event.event_type === 'engineer_action';

                    return (
                      <div key={idx} className="timeline-item">
                        <div
                          className={`timeline-dot ${
                            isResolution
                              ? 'timeline-dot-success'
                              : isMemory
                              ? 'timeline-dot-accent'
                              : isAction
                              ? 'timeline-dot-warning'
                              : 'timeline-dot-default'
                          }`}
                        />
                        <div className="timeline-content">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-primary">
                              {event.title}
                            </span>
                            <span className="text-[10px] text-muted flex-shrink-0">
                              {formatDate(event.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-secondary mt-0.5 whitespace-pre-wrap">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Engineer Action / Note Logger Input Form */}
            <div className="p-4 border-t border-border bg-subtle">
              <div className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                <Terminal size={14} className="text-accent" /> Log Action / Triage Note
              </div>
              <form onSubmit={handleLogAction} className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Action taken (e.g., Restarted auth-pod-4, Scaled replica count to 10)..."
                  className="form-input text-xs"
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Optional notes / observability link..."
                    className="form-input text-xs flex-1"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="btn btn-primary btn-sm flex items-center gap-1 px-3"
                  >
                    {submittingAction ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    <span>Log</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Resolution Details Card (If Resolved) */}
          {incident.status === 'resolved' && (
            <div className="card border-success/40 bg-success/5">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-success" />
                  <h3 className="text-sm font-semibold text-success">Incident Resolution</h3>
                </div>
                {incident.memory_stored && (
                  <span className="badge badge-success text-[10px] flex items-center gap-1">
                    <Brain size={11} /> Saved in Hindsight
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <div className="font-semibold text-primary">Identified Root Cause:</div>
                  <div className="text-secondary mt-0.5">{incident.root_cause}</div>
                </div>
                <div>
                  <div className="font-semibold text-primary">Resolution Action Applied:</div>
                  <div className="text-secondary mt-0.5">{incident.resolution_action}</div>
                </div>
                {incident.resolution_notes && (
                  <div>
                    <div className="font-semibold text-primary">Prevention Learnings:</div>
                    <div className="text-secondary mt-0.5">{incident.resolution_notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      <ResolveModal
        incident={incident}
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        onResolved={(updated) => {
          setIncident(updated);
          fetchIncidentData(true);
        }}
      />
    </div>
  );
}
