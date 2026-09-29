import { formatDistanceToNow, format } from 'date-fns';

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_COLORS = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

export const STATUS_LABELS = {
  open: 'Open',
  investigating: 'Investigating',
  mitigated: 'Mitigated',
  resolved: 'Resolved',
  postmortem: 'Post-mortem',
};

export const EVENT_TYPE_COLORS = {
  alert: '#f97316',
  evidence: '#60a5fa',
  memory_recall: '#06b6d4',
  agent_analysis: '#a78bfa',
  engineer_action: '#34d399',
  status_change: '#94a3b8',
  resolution: '#22c55e',
  memory_stored: '#06b6d4',
};

export const EVENT_TYPE_ICONS = {
  alert: '🚨',
  evidence: '🔍',
  memory_recall: '🧠',
  agent_analysis: '🤖',
  engineer_action: '⚡',
  status_change: '📋',
  resolution: '✅',
  memory_stored: '💾',
};

export function timeAgo(date) {
  if (!date) return '—';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function formatDate(date, fmt = 'MMM dd, HH:mm') {
  if (!date) return '—';
  try {
    return format(new Date(date), fmt);
  } catch {
    return '—';
  }
}

export function formatDuration(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function severityBadgeClass(severity) {
  return `badge badge-${severity}`;
}
export const getSeverityBadgeClass = severityBadgeClass;

export function statusBadgeClass(status) {
  return `badge badge-status-${status}`;
}
export const getStatusBadgeClass = statusBadgeClass;
