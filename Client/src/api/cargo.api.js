import api from './axiosInstance';

// ── Shipments ──────────────────────────────────────────────────────
export const getShipments = (params) => api.get('/cargo/shipments', { params });
export const getShipmentById = (id) => api.get(`/cargo/shipments/${id}`);
export const createShipment = (data) => api.post('/cargo/shipments', data);
export const updateShipment = (id, data) => api.put(`/cargo/shipments/${id}`, data);
export const updateShipmentStatus = (id, status) => api.patch(`/cargo/shipments/${id}/status`, { status });
export const assignManifestToShipment = (shipmentId, manifestId) =>
  api.post(`/cargo/shipments/${shipmentId}/manifests/${manifestId}`);

// ── Manifests ──────────────────────────────────────────────────────
export const getManifests = (params) => api.get('/cargo/manifests', { params });
export const getManifestById = (id) => api.get(`/cargo/manifests/${id}`);
export const createManifest = (data) => api.post('/cargo/manifests', data);
export const updateManifest = (id, data) => api.put(`/cargo/manifests/${id}`, data);
export const updateManifestStatus = (id, status) => api.patch(`/cargo/manifests/${id}/status`, { status });
export const addManifestItem = (manifestId, itemData) => api.post(`/cargo/manifests/${manifestId}/items`, itemData);
export const updateManifestItemQR = (manifestId, itemCode, qrData) =>
  api.patch(`/cargo/manifests/${manifestId}/items/${itemCode}/qr`, qrData);

// ── QR Generation & Scan Lookup ──────────────────────────────────────────────
export const generateManifestQRs = (manifestId) => api.post(`/cargo/manifests/${manifestId}/generate-qr`);
export const generateSingleItemQR = (manifestId, itemCode) => api.post(`/cargo/manifests/${manifestId}/items/${itemCode}/qr`);
export const getScanCargoInfo = (trackingCode) => api.get(`/cargo/scan/${trackingCode}`);
export const getCargoItemById = (itemId) => api.get(`/cargo-items/${itemId}`);

// Resolves a scanned QR / itemCode → full box + manifest + shipment details
export const lookupBoxByQR = async (itemCode) => {
  try {
    const scanRes = await getScanCargoInfo(itemCode);
    if (scanRes?.success && scanRes?.cargo) {
      return { manifest: { _id: scanRes.cargo.manifestId, manifestNumber: scanRes.cargo.manifestNumber }, item: scanRes.cargo, checkpoints: scanRes.checkpoints };
    }
  } catch (err) {
    // fallback search
  }
  const res = await api.get('/cargo/manifests');
  const manifests = res?.data?.manifests || res?.manifests || [];
  for (const m of manifests) {
    const item = (m.items || []).find(i => i.itemCode === itemCode || i.boxCode === itemCode || i.qrCode === itemCode || i.trackingCode === itemCode);
    if (item) return { manifest: m, item };
  }
  return null;
};

// ── Checkpoints ────────────────────────────────────────────────────
export const getAllCheckpoints = (params) => api.get('/cargo/checkpoints', { params });
export const getManifestCheckpoints = (manifestId) => api.get(`/cargo/checkpoints/manifest/${manifestId}`);
export const createCheckpoint = (data) => api.post('/cargo/checkpoints', data);
export const syncOfflineCheckpointsApi = (checkpoints) => api.post('/cargo/checkpoints/sync', { checkpoints });

// ── SKU Master ─────────────────────────────────────────────────────
export const getSKUs = (params) => api.get('/cargo/skus', { params });
export const getSKUById = (id) => api.get(`/cargo/skus/${id}`);
export const createSKU = (data) => api.post('/cargo/skus', data);
export const updateSKU = (id, data) => api.patch(`/cargo/skus/${id}`, data);
export const getSKUInventorySummary = () => api.get('/cargo/skus/summary/inventory');

// ── Receive Cargo (online mode) ────────────────────────────────────
export const receiveCargo = (data) => api.post('/cargo/receiving', data);

