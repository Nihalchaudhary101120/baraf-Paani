import api from './axiosInstance';

// ── Field Excursions ───────────────────────────────────────────────
export const getExcursions = (params) => api.get('/field/excursions', { params });
export const getExcursionById = (id) => api.get(`/field/excursions/${id}`);
export const createExcursion = (data) => api.post('/field/excursions', data);
export const updateExcursionStatus = (id, status) =>
  api.patch(`/field/excursions/${id}/status`, { status });

// ── Field Check-ins ────────────────────────────────────────────────
export const getCheckIns = (excursionId) =>
  api.get('/field/checkins', { params: { excursionId } });
export const createCheckIn = (data) => api.post('/field/checkins', data);

// ── Equipment ─────────────────────────────────────────────────────
export const getEquipment = (excursionId) =>
  api.get('/field/equipment', { params: { excursionId } });
export const issueEquipment = (data) => api.post('/field/equipment/issue', data);
export const returnEquipment = (data) => api.post('/field/equipment/return', data);
