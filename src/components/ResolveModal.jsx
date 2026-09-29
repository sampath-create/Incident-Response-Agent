import React, { useState } from 'react';
import { X, CheckCircle2, Brain, Sparkles, Loader2 } from 'lucide-react';
import { resolveIncident } from '../api';
import toast from 'react-hot-toast';

export default function ResolveModal({ incident, isOpen, onClose, onResolved }) {
  const [rootCause, setRootCause] = useState('');
  const [resolutionAction, setResolutionAction] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !incident) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rootCause.trim() || !resolutionAction.trim()) {
      toast.error('Please enter both Root Cause and Resolution Action');
      return;
    }

    try {
      setLoading(true);
      const updated = await resolveIncident(incident.incident_id, {
        root_cause: rootCause.trim(),
        resolution_action: resolutionAction.trim(),
        resolution_notes: resolutionNotes.trim() || undefined,
      });
      toast.success(
        `Incident ${incident.incident_id} resolved! Experience saved to Hindsight memory bank.`,
        { duration: 5000 }
      );
      onResolved(updated);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to resolve incident');
    } finally {
      setLoading(false);
    }
  };

  const handleUseAgentRecommendation = () => {
    if (incident.agent_recommendation) {
      setResolutionAction(incident.agent_recommendation.substring(0, 300));
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container max-w-xl">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="icon-badge icon-badge-success">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 className="modal-title">Resolve & Retain Incident</h3>
              <p className="text-xs text-muted">
                {incident.incident_id} • {incident.service}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="memory-banner">
              <Brain size={20} className="text-accent flex-shrink-0" />
              <div className="text-xs">
                <strong>Hindsight Memory Retain:</strong> Resolving this incident will
                automatically index the root cause and mitigation into long-term memory so OpsMind
                can recognize it in the future.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Root Cause *</label>
              <textarea
                required
                rows={3}
                className="form-input text-sm"
                placeholder="e.g., HikariCP connection pool exhausted due to unindexed slow query in checkout microservice..."
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label mb-0">Resolution Action *</label>
                {incident.agent_recommendation && (
                  <button
                    type="button"
                    onClick={handleUseAgentRecommendation}
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={12} /> Auto-fill from Agent
                  </button>
                )}
              </div>
              <textarea
                required
                rows={3}
                className="form-input text-sm"
                placeholder="e.g., Increased maxPoolSize to 50, added composite index on (product_id, status), redeployed..."
                value={resolutionAction}
                onChange={(e) => setResolutionAction(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Postmortem Learnings / Prevention Notes</label>
              <textarea
                rows={2}
                className="form-input text-sm"
                placeholder="e.g., Add database connection pool saturation alert at 80% threshold in Datadog."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success btn-sm flex items-center gap-1-5"
              disabled={loading}
              id="btn-confirm-resolve"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving Memory...
                </>
              ) : (
                <>
                  <Brain size={16} /> Resolve & Retain in Memory
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
