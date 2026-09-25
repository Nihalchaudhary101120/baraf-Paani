import api from './axiosInstance';

// ── Inventory Items ────────────────────────────────────────────────
export const getInventoryItems = (params) => api.get('/inventory/items', { params });
export const getInventoryItemById = (id) => api.get(`/inventory/items/${id}`);
export const createInventoryItem = (data) => api.post('/inventory/items', data);

// ── Inventory Transactions ─────────────────────────────────────────
export const getTransactions = (params) => api.get('/inventory/transactions', { params });
export const createTransaction = (data) => api.post('/inventory/transactions', data);
