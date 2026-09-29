import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Plus,
  Brain,
  Zap,
  Activity,
  Sparkles,
  Database
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/memory', icon: Brain, label: 'Hindsight Memory' },
];

export default function Sidebar({ onOpenNewIncident, onNewIncident }) {
  const handleNew = onOpenNewIncident || onNewIncident;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">🧠</div>
          <div>
            <div className="logo-text">OpsMind</div>
            <div className="logo-tagline">Incident Response Agent</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>

        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 16 }}>Actions</div>

        <button className="nav-item" onClick={handleNew} id="new-incident-sidebar-btn">
          <Plus size={16} />
          <span>New Incident</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="hindsight-badge">
          <div className="hindsight-label flex items-center gap-1">
            <Sparkles size={12} className="text-accent" /> Hindsight Memory
          </div>
          <div className="hindsight-status flex items-center gap-1.5 mt-1 text-[11px] text-success">
            <div className="dot-pulse" />
            <span>Memory Bank Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
