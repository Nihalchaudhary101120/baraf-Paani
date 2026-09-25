import api from './axiosInstance';

// ── SOS Alerts ────────────────────────────────────────────────────
export const getSosAlerts = (params) => api.get('/sos', { params });
export const getSosById = (id) => api.get(`/sos/${id}`);
export const createSos = (data) => api.post('/sos', data);
export const updateSosStatus = (id, data) => api.patch(`/sos/${id}/status`, data);

// ── Incident Events (timeline) ────────────────────────────────────
export const getIncidentEvents = (sosId) =>
  api.get('/sos/events', { params: { sosId } });
export const addIncidentEvent = (data) => api.post('/sos/events', data);
