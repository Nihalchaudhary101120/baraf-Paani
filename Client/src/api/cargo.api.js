import api from './axiosInstance';

// ── Shipments ──────────────────────────────────────────────────────
export const getShipments = () => api.get('/cargo/shipments');
export const getShipmentById = (id) => api.get(`/cargo/shipments/${id}`);
export const createShipment = (data) => api.post('/cargo/shipments', data);
export const updateShipment = (id, data) => api.put(`/cargo/shipments/${id}`, data);

// ── Manifests ──────────────────────────────────────────────────────
export const getManifests = (params) => api.get('/cargo/manifests', { params });
export const getManifestById = (id) => api.get(`/cargo/manifests/${id}`);
export const createManifest = (data) => api.post('/cargo/manifests', data);

// ── Checkpoints ────────────────────────────────────────────────────
export const getCheckpoints = (manifestId) =>
  api.get('/cargo/checkpoints', { params: { manifestId } });
export const createCheckpoint = (data) => api.post('/cargo/checkpoints', data);

// ── Receive Cargo (online mode) ────────────────────────────────────
export const receiveCargo = (data) => api.post('/cargo/receiving', data);
