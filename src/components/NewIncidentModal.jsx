import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  AlertTriangle,
  Zap,
  Cpu,
  Layers,
  Sparkles,
  Loader2,
  Server
} from 'lucide-react';
import { createIncident } from '../api';
import toast from 'react-hot-toast';

const PRESETS = [
  {
    title: 'Checkout DB Pool Saturation',
    service: 'checkout-service',
    severity: 'critical',
    symptom: '500 Internal Server Errors spike to 22%, HTTP timeouts exceeding 15s during checkout step',
    deployment: 'v2.4.1 (released 15 mins ago)',
    badge: 'High Similarity to INC-0010',
  },
  {
    title: 'Auth JWKS Cache Miss Spike',
    service: 'auth-service',
    severity: 'high',
    symptom: 'JWT validation failures across API gateway, 401 Unauthorized errors elevated by 450%',
    deployment: 'v1.18.0',
    badge: 'Matches Redis Key Expiry Pattern',
  },
  {
    title: 'Payment Webhook Backpressure',
    service: 'payment-gateway',
    severity: 'high',
    symptom: 'Stripe webhook queue backlog > 12,000 messages, confirmation delays averaging 9 minutes',
    deployment: 'v3.2.0',
    badge: 'Matches Deadlock Ledger Pattern',
  },
];

export default function NewIncidentModal({ isOpen, onClose, onCreated }) {
  const navigate = useNavigate();
  const [service, setService] = useState('checkout-service');
  const [severity, setSeverity] = useState('critical');
  const [symptom, setSymptom] = useState('');
  const [deployment, setDeployment] = useState('v2.4.1');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const applyPreset = (p) => {
    setService(p.service);
    setSeverity(p.severity);
    setSymptom(p.symptom);
    setDeployment(p.deployment);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!service.trim() || !symptom.trim()) {
      toast.error('Please enter service name and symptom');
      return;
    }

    try {
      setLoading(true);
      const inc = await createIncident({
        service: service.trim(),
        severity,
        symptom: symptom.trim(),
        deployment: deployment.trim() || undefined,
      });
      toast.success(`Incident ${inc.incident_id} created! AI Investigation started in background.`);
      if (onCreated) onCreated(inc);
      onClose();
      navigate(`/incidents/${inc.incident_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container max-w-xl">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="icon-badge icon-badge-danger">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="modal-title">Trigger New Incident Alert</h3>
              <p className="text-xs text-muted">
                OpsMind agent will gather telemetry and query Hindsight long-term memory
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="p-4 border-b border-border bg-subtle">
          <div className="text-xs font-semibold text-muted mb-2 flex items-center gap-1">
            <Sparkles size={13} className="text-accent" /> QUICK SCENARIOS (Click to load):
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-left p-2 rounded border border-border bg-card hover:border-accent transition-colors"
              >
                <div className="text-xs font-semibold text-primary truncate">{p.title}</div>
                <div className="text-[10px] text-accent truncate">{p.badge}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Service Name *</label>
                <input
                  type="text"
                  required
                  className="form-input text-sm"
                  placeholder="e.g., checkout-service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Severity *</label>
                <select
                  className="form-select text-sm"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option value="critical">Critical (P0 / P1)</option>
                  <option value="high">High (P2)</option>
                  <option value="medium">Medium (P3)</option>
                  <option value="low">Low (P4)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Active Deployment / Commit Tag</label>
              <input
                type="text"
                className="form-input text-sm"
                placeholder="e.g., v2.4.1 or sha-8f92a1"
                value={deployment}
                onChange={(e) => setDeployment(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Symptom / Alert Description *</label>
              <textarea
                required
                rows={4}
                className="form-input text-sm"
                placeholder="Describe the alert, HTTP status error spike, latency degradation, or abnormal metrics..."
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm flex items-center gap-1-5"
              disabled={loading}
              id="btn-submit-incident"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Dispatching Agent...
                </>
              ) : (
                <>
                  <Zap size={16} /> Trigger Incident & AI Investigation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
