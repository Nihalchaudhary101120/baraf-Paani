import api from './axiosInstance';

// ── 1. Incident Initiation & Listing ──────────────────────────────
export const createSOS = (data) => api.post('/sos', data);
export const getActiveSOS = (params) => api.get('/sos/active', { params });
export const getSOSById = (id) => api.get(`/sos/${id}`);

// ── 2. Incident Status & Command Lifecycle Controls ───────────────
export const acknowledgeSOS = (id, data = {}) => api.patch(`/sos/${id}/acknowledge`, data);
export const assessSOS = (id, data = {}) => api.patch(`/sos/${id}/assess`, data);
export const updateSOSStatus = (id, data) => api.patch(`/sos/${id}/status`, data);
export const resolveSOS = (id, data) => api.patch(`/sos/${id}/resolve`, data);

// ── 3. Responder Volunteering & Team Coordination ─────────────────
export const volunteerResponse = (id, data) => api.post(`/sos/${id}/respond`, data);
export const standDownResponse = (id, data = {}) => api.patch(`/sos/${id}/stand-down`, data);
export const updateVolunteerStatus = (id, data) => api.patch(`/sos/${id}/responder-status`, data);
export const assignResponseTeam = (id, data) => api.patch(`/sos/${id}/assign-team`, data);
export const getResponders = (id) => api.get(`/sos/${id}/responders`);

// ── 4. Command Assignment & Overrides ──────────────────────────────
export const acceptResponder = (id, data) => api.patch(`/sos/${id}/accept-responder`, data);
export const declineVolunteer = (id, data) => api.patch(`/sos/${id}/decline-volunteer`, data);
export const assignResponder = (id, data) => api.patch(`/sos/${id}/assign`, data);

// ── 5. Live Telemetry & Personnel Queries ─────────────────────────
export const updateResponderLocation = (id, data) => api.patch(`/sos/${id}/location`, data);
export const getNearbyCandidates = (id) => api.get(`/sos/${id}/nearby-candidates`);

// ── Legacy Compatibility ──────────────────────────────────────────
export const getSosAlerts = (params) => getActiveSOS(params);
export const getSosById = (id) => getSOSById(id);
export const createSos = (data) => createSOS(data);
export const updateSosStatus = (id, data) => updateSOSStatus(id, data);
export const getIncidentEvents = (sosId) => api.get(`/sos/${sosId}`).then(res => ({ data: res.data?.sos?.timeline || [] }));
export const addIncidentEvent = (data) => api.patch(`/sos/${data.sosId}/status`, data);
