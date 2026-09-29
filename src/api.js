import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Incidents API
export const getStats = () => api.get('/api/incidents/stats').then(r => r.data);

export const listIncidents = (params = {}) =>
  api.get('/api/incidents', { params }).then(r => r.data);

export const getIncident = (id) =>
  api.get(`/api/incidents/${id}`).then(r => r.data);

export const createIncident = (data) =>
  api.post('/api/incidents', data).then(r => r.data);

export const triggerInvestigation = (id) =>
  api.post(`/api/incidents/${id}/investigate`).then(r => r.data);

export const updateStatus = (id, status) =>
  api.patch(`/api/incidents/${id}/status`, { status }).then(r => r.data);

export const logAction = (id, data) =>
  api.post(`/api/incidents/${id}/action`, data).then(r => r.data);

export const resolveIncident = (id, data) =>
  api.post(`/api/incidents/${id}/resolve`, data).then(r => r.data);

export const getTimeline = (id) =>
  api.get(`/api/incidents/${id}/timeline`).then(r => r.data);

// Memory & Hindsight API
export const searchMemory = (q) =>
  api.get('/api/memory/search', { params: { q } }).then(r => r.data);

export const reflectMemory = (query) =>
  api.post('/api/memory/reflect', { query }).then(r => r.data);

export const retainMemory = (content) =>
  api.post('/api/memory/retain', { content }).then(r => r.data);

export const seedPlaybooks = () =>
  api.post('/api/memory/seed-playbooks').then(r => r.data);

// System
export const getHealth = () =>
  api.get('/api/health').then(r => r.data);

export default api;
