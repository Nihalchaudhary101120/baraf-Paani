import api from './axiosInstance';

// ── Shipments ──────────────────────────────────────────────────────
export const getShipments = (params) => api.get('/cargo/shipments', { params });
export const getShipmentById = (id) => api.get(`/cargo/shipments/${id}`);
export const createShipment = (data) => api.post('/cargo/shipments', data);
export const updateShipment = (id, data) => api.put(`/cargo/shipments/${id}`, data);
export const updateShipmentStatus = (id, status) => api.patch(`/cargo/shipments/${id}/status`, { status });

// ── Manifests ──────────────────────────────────────────────────────
export const getManifests = (params) => api.get('/cargo/manifests', { params });
export const getManifestById = (id) => api.get(`/cargo/manifests/${id}`);
export const createManifest = (data) => api.post('/cargo/manifests', data);
export const updateManifestStatus = (id, status) => api.patch(`/cargo/manifests/${id}/status`, { status });

// ── Checkpoints ────────────────────────────────────────────────────
export const getAllCheckpoints = (params) => api.get('/cargo/checkpoints', { params });
export const getManifestCheckpoints = (manifestId) => api.get(`/cargo/checkpoints/manifest/${manifestId}`);
export const createCheckpoint = (data) => api.post('/cargo/checkpoints', data);

// ── Receive Cargo (online mode) ────────────────────────────────────
export const receiveCargo = (data) => api.post('/cargo/receiving', data);
