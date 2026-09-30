import api from './axiosInstance';

// ── Station Inventory ───────────────────────────────────────────────────────

/**
 * Get aggregated inventory list for a station.
 * @param {string} stationId
 * @param {Object} params - { search, category, status, sort, order }
 */
export const getStationInventory = (stationId, params) =>
  api.get(`/inventory/${stationId}`, { params });

/**
 * Get summary cards for a station.
 * @param {string} stationId
 */
export const getStationSummary = (stationId) =>
  api.get(`/inventory/${stationId}/summary`);

/**
 * Get FCFS batch details for a specific SKU at a station.
 * @param {string} stationId
 * @param {string} skuId - MongoDB ObjectId or skuCode string
 */
export const getItemBatches = (stationId, skuId) =>
  api.get(`/inventory/${stationId}/${skuId}/batches`);

/**
 * Consume stock using FCFS algorithm.
 * @param {string} stationId
 * @param {Object} payload - { skuId, skuCode, quantity, reason, notes }
 */
export const consumeStock = (stationId, payload) =>
  api.post(`/inventory/${stationId}/consume`, payload);

/**
 * Get transaction history for a station.
 * @param {string} stationId
 * @param {Object} params - { page, limit, type, skuCode }
 */
export const getTransactionHistory = (stationId, params) =>
  api.get(`/inventory/${stationId}/transactions`, { params });

// ── HQ Multi-Station ────────────────────────────────────────────────────────

/**
 * Get all stations' inventory summary (HQ view).
 */
export const getAllStationsInventory = () =>
  api.get('/inventory/stations');

// ── Manual Receipt ──────────────────────────────────────────────────────────

/**
 * Manually trigger inventory receipt for a delivered manifest.
 * @param {string} stationId
 * @param {Object} payload - { manifestId }
 */
export const manualReceiveCargo = (stationId, payload) =>
  api.post(`/inventory/${stationId}/receive`, payload);
