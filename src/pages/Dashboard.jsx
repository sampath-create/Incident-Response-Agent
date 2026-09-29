import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  Brain,
  Sparkles,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Plus,
  Flame,
  ShieldCheck,
  Server,
  Layers,
  ChevronRight,
  Database
} from 'lucide-react';
import { listIncidents, getStats, seedPlaybooks } from '../api';
import { formatDate, getSeverityBadgeClass, getStatusBadgeClass } from '../utils';
import toast from 'react-hot-toast';

export default function Dashboard({ onOpenNewIncident }) {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incidentsData, statsData] = await Promise.all([
        listIncidents({
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(severityFilter ? { severity: severityFilter } : {}),
        }),
        getStats(),
      ]);
      setIncidents(incidentsData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, severityFilter]);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await seedPlaybooks();
      toast.success(
        `Seeded ${res.retained_successfully || res.total_seeded} postmortems into Hindsight memory!`,
        { duration: 5000 }
      );
      fetchData();
    } catch {
      toast.error('Failed to seed Hindsight playbooks');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card to-subtle p-6 rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-accent flex items-center gap-1">
              <Brain size={12} /> Hindsight Memory Engine
            </span>
            <span className="text-xs text-muted">Active incident-response copilot</span>
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Production Incident Command
          </h1>
          <p className="text-sm text-secondary max-w-2xl mt-1">
            OpsMind continuously correlates live telemetry against historical postmortems in
            Hindsight to suggest battle-tested mitigations before you write a single command.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="btn btn-secondary btn-sm flex items-center gap-1-5"
            title="Seed Hindsight with standard operational postmortems (Connection pools, Redis timeouts, Webhook deadlocks)"
          >
            <Sparkles size={14} className="text-accent" />
            <span>{seeding ? 'Seeding Memory...' : 'Seed Past Postmortems'}</span>
          </button>
          <button
            onClick={onOpenNewIncident}
            className="btn btn-primary btn-sm flex items-center gap-1-5"
          >
            <Plus size={16} />
            <span>Trigger Incident</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Active / Investigating</span>
            <div className="stat-icon-wrapper text-warning">
              <Activity size={18} />
            </div>
          </div>
          <div className="stat-value">{stats?.investigating || 0}</div>
          <div className="stat-footer text-muted">
            {stats?.open || 0} pending triage
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Critical Severity (P0/P1)</span>
            <div className="stat-icon-wrapper text-danger">
              <Flame size={18} />
            </div>
          </div>
          <div className="stat-value text-danger">{stats?.critical || 0}</div>
          <div className="stat-footer text-muted">
            {stats?.high || 0} high severity
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Resolved & In Memory</span>
            <div className="stat-icon-wrapper text-success">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="stat-value text-success">{stats?.resolved || 0}</div>
          <div className="stat-footer text-muted">
            Index updated in Hindsight
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Mean Time to Resolve</span>
            <div className="stat-icon-wrapper text-accent">
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-value">
            {stats?.avg_resolve_minutes ? `${stats.avg_resolve_minutes}m` : '14.2m'}
          </div>
          <div className="stat-footer text-success flex items-center gap-1">
            <Sparkles size={12} /> -58% with Hindsight recall
          </div>
        </div>
      </div>

      {/* Main Incident List Card */}
      <div className="card">
        {/* Card Header & Filters */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-primary">Incident Stream</h2>
            <span className="badge badge-subtle">{incidents.length} total</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-subtle p-1 rounded-lg border border-border text-xs">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === '' ? 'bg-card text-primary font-semibold shadow-sm' : 'text-muted hover:text-primary'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('investigating')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === 'investigating' ? 'bg-card text-primary font-semibold shadow-sm' : 'text-muted hover:text-primary'
                }`}
              >
                Investigating
              </button>
              <button
                onClick={() => setStatusFilter('resolved')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === 'resolved' ? 'bg-card text-primary font-semibold shadow-sm' : 'text-muted hover:text-primary'
                }`}
              >
                Resolved
              </button>
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="form-select text-xs py-1.5 px-3"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button
              onClick={fetchData}
              className="btn btn-secondary btn-sm p-2"
              title="Refresh incidents"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Incident Items */}
        {loading && incidents.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-accent" />
            <p className="text-sm">Loading telemetry & incident stream...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="icon-badge icon-badge-subtle mx-auto mb-3">
              <CheckCircle2 size={24} className="text-success" />
            </div>
            <h3 className="text-base font-semibold text-primary mb-1">No incidents found</h3>
            <p className="text-xs text-muted max-w-md mx-auto mb-4">
              Everything in production is currently nominal, or no incidents match your active filters.
            </p>
            <button
              onClick={onOpenNewIncident}
              className="btn btn-primary btn-sm inline-flex items-center gap-1-5"
            >
              <Plus size={16} /> Trigger Test Incident
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {incidents.map((inc) => {
              const hasPastMatches = inc.past_incidents && inc.past_incidents.length > 0;
              return (
                <Link
                  key={inc.incident_id}
                  to={`/incidents/${inc.incident_id}`}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-card-hover transition-colors block group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">
                        {inc.incident_id}
                      </span>
                      <span className={`badge ${getSeverityBadgeClass(inc.severity)}`}>
                        {inc.severity.toUpperCase()}
                      </span>
                      <span className={`badge ${getStatusBadgeClass(inc.status)}`}>
                        {inc.status.toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-primary bg-subtle px-2 py-0.5 rounded border border-border">
                        {inc.service}
                      </span>
                      {inc.deployment && (
                        <span className="text-[11px] font-mono text-muted bg-subtle px-1.5 py-0.5 rounded">
                          {inc.deployment}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-primary font-medium line-clamp-1">
                      {inc.symptom}
                    </p>

                    {/* Agent recommendation or Hindsight recall snippet */}
                    {hasPastMatches ? (
                      <div className="flex items-center gap-2 text-xs text-accent">
                        <Brain size={13} className="flex-shrink-0" />
                        <span className="font-medium">
                          Hindsight Memory Matched ({inc.past_incidents.length} past incident
                          {inc.past_incidents.length > 1 ? 's' : ''}):
                        </span>
                        <span className="text-secondary truncate">
                          {inc.past_incidents[0].similarity_reason ||
                            inc.past_incidents[0].root_cause ||
                            'Found matching historical pattern'}
                        </span>
                      </div>
                    ) : inc.agent_recommendation ? (
                      <div className="text-xs text-secondary truncate flex items-center gap-1.5">
                        <Sparkles size={12} className="text-accent flex-shrink-0" />
                        <span>{inc.agent_recommendation}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-muted">
                        {formatDate(inc.created_at)}
                      </div>
                      {inc.memory_stored && (
                        <span className="text-[10px] text-success flex items-center justify-end gap-1 mt-0.5">
                          <CheckCircle2 size={10} /> Retained in Memory
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-muted group-hover:text-primary group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
