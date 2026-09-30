import api from './axiosInstance';

// ── Field Excursions ───────────────────────────────────────────────
export const getActiveExcursions = (params) => api.get('/field-excursions/active', { params });
export const getExcursionHistory = (params) => api.get('/field-excursions/history', { params });
export const getMyActiveExcursions = () => api.get('/field-excursions/my-active');
export const getExcursions = (params) => api.get('/field-excursions/active', { params });
export const getExcursionById = (id) => api.get(`/field-excursions/${id}`);
export const createExcursion = (data) => api.post('/field-excursions', data);
export const startExcursion = (id) => api.post(`/field-excursions/${id}/start`);
export const markExcursionReturned = (id) => api.post(`/field-excursions/${id}/return`);
export const cancelExcursion = (id) => api.post(`/field-excursions/${id}/cancel`);

// ── Field Check-ins ────────────────────────────────────────────────
export const submitCheckIn = (excursionId, data) =>
  api.post(`/field-excursions/${excursionId}/check-ins`, data);
export const getCheckIns = (excursionId) =>
  api.get(`/field-excursions/${excursionId}/check-ins`);
export const getLatestCheckIns = (excursionId) =>
  api.get(`/field-excursions/${excursionId}/latest-check-ins`);

// Legacy alias
export const createCheckIn = (data) =>
  api.post(`/field-excursions/${data.excursionId}/check-ins`, data);

// ── Equipment (separate module) ───────────────────────────────────
export const getEquipment = (excursionId) =>
  api.get('/field/equipment', { params: { excursionId } });
export const issueEquipment = (data) => api.post('/field/equipment/issue', data);
export const returnEquipment = (data) => api.post('/field/equipment/return', data);
