import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Search,
  Plus,
  Brain,
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Database
} from 'lucide-react';
import { getHealth } from '../api';

export default function Navbar({ onOpenNewIncident }) {
  const [health, setHealth] = useState({ status: 'checking' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    try {
      setIsRefreshing(true);
      const data = await getHealth();
      setHealth(data);
    } catch {
      setHealth({ status: 'offline' });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'ok';

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search incidents, services, or runbooks..."
            className="search-input"
          />
        </div>
      </div>

      <div className="navbar-right">
        {/* System Status Pill */}
        <div className={`status-pill ${isHealthy ? 'status-online' : 'status-offline'}`}>
          <span className="status-dot"></span>
          <Brain size={14} className="status-icon" />
          <span className="status-text">
            Hindsight Memory: <strong>{isHealthy ? 'Connected' : 'Offline'}</strong>
          </span>
        </div>

        {/* Create Incident Button */}
        <button
          onClick={onOpenNewIncident}
          className="btn btn-primary btn-sm flex items-center gap-1-5"
          id="btn-create-incident-nav"
        >
          <Plus size={16} />
          <span>New Incident</span>
        </button>
      </div>
    </header>
  );
}
