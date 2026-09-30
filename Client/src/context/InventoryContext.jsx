import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  getStationInventory,
  getStationSummary,
  getItemBatches as fetchBatchesApi,
  consumeStock as consumeStockApi,
  getTransactionHistory as fetchTransactionsApi,
  getAllStationsInventory,
} from '@/api/inventory.api';
import { queueEvent } from '@/services/syncServices/queueService';

export const InventoryContext = createContext(null);

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within an InventoryProvider');
  return ctx;
};

export const InventoryProvider = ({ children }) => {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [inventory, setInventory] = useState([]);          // aggregated per-SKU list
  const [batches, setBatches] = useState({});              // keyed by skuCode or skuId
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalSKUs: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    recentReceipts: 0,
  });
  const [hqStations, setHqStations] = useState([]);        // HQ multi-station view
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stationId, setStationId] = useState(null);

  // Track current filter params so refresh() can re-use them
  const lastParamsRef = useRef({});

  const resolveTargetStation = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val._id || val.id || val.code || null;
    return String(val);
  };

  // ── Fetch inventory list ────────────────────────────────────────────────────
  const fetchInventory = useCallback(async (sid, params = {}) => {
    const targetStation = resolveTargetStation(sid) || resolveTargetStation(stationId);
    if (!targetStation) return;

    setLoading(true);
    setError(null);
    lastParamsRef.current = { sid: targetStation, params };

    try {
      const [invRes, sumRes] = await Promise.all([
        getStationInventory(targetStation, params),
        getStationSummary(targetStation),
      ]);

      setStationId(targetStation);
      setInventory(invRes?.inventory || []);
      setSummary(sumRes?.summary || {});
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  // ── Refresh (re-uses last params) ──────────────────────────────────────────
  const refreshInventory = useCallback(() => {
    const { sid, params } = lastParamsRef.current;
    if (sid) fetchInventory(sid, params);
  }, [fetchInventory]);

  // ── Fetch batch details for a specific SKU ─────────────────────────────────
  const fetchItemBatches = useCallback(async (sid, skuKey) => {
    const targetStation = resolveTargetStation(sid) || resolveTargetStation(stationId);
    if (!targetStation || !skuKey) return [];

    setBatchLoading(true);
    try {
      const res = await fetchBatchesApi(targetStation, skuKey);
      const key = String(skuKey);
      setBatches(prev => ({ ...prev, [key]: res?.batches || [] }));
      return res?.batches || [];
    } catch (err) {
      console.error('[InventoryContext] fetchItemBatches:', err.message);
      return [];
    } finally {
      setBatchLoading(false);
    }
  }, [stationId]);

  // ── Consume stock (FCFS) ────────────────────────────────────────────────────
  /**
   * consumeStock — handles both online and offline scenarios.
   *
   * Online:  Calls backend → backend enforces FCFS, returns updated state.
   * Offline: Queues event to PouchDB → optimistically updates local state.
   *
   * @returns {{ success, message, transaction?, error? }}
   */
  const consumeStock = useCallback(async (sid, payload) => {
    const targetStation = resolveTargetStation(sid) || resolveTargetStation(stationId);

    if (!navigator.onLine) {
      // ── Offline path: queue to PouchDB ──────────────────────────────
      try {
        const offlineEvent = await queueEvent({
          type: 'INVENTORY_CONSUMPTION',
          stationId: targetStation,
          skuId: payload.skuId,
          skuCode: payload.skuCode,
          quantity: payload.quantity,
          reason: payload.reason,
          notes: payload.notes,
          offlineCreated: true,
        });

        // Optimistic update — subtract from inventory
        setInventory(prev =>
          prev.map(item => {
            const isSku =
              (payload.skuId && String(item.skuId) === String(payload.skuId)) ||
              (payload.skuCode && item.skuCode === payload.skuCode?.toUpperCase());
            if (!isSku) return item;
            return {
              ...item,
              totalRemaining: Math.max(0, (item.totalRemaining || 0) - payload.quantity),
            };
          })
        );

        return {
          success: true,
          offline: true,
          message: `Queued offline — ${payload.quantity} units of ${payload.skuCode || 'item'} will sync when connected.`,
          eventId: offlineEvent.eventId,
        };
      } catch (offlineErr) {
        return { success: false, error: offlineErr.message };
      }
    }

    // ── Online path: call backend ────────────────────────────────────
    try {
      const res = await consumeStockApi(targetStation, payload);

      if (res?.success) {
        // Update inventory list in-place — no full reload
        setInventory(prev =>
          prev.map(item => {
            const isSku =
              (payload.skuId && String(item.skuId) === String(payload.skuId)) ||
              (payload.skuCode && item.skuCode === payload.skuCode?.toUpperCase());
            if (!isSku) return item;
            return {
              ...item,
              totalRemaining: res.remainingTotal ?? Math.max(0, (item.totalRemaining || 0) - payload.quantity),
            };
          })
        );

        // Update cached batches for this SKU if they were loaded
        const skuKey = payload.skuId || payload.skuCode;
        if (skuKey && batches[skuKey]) {
          // Re-fetch batches to reflect new DEPLETED states
          fetchItemBatches(targetStation, skuKey);
        }

        // Prepend new transaction to history if loaded
        if (res.transaction && transactions.length > 0) {
          setTransactions(prev => [res.transaction, ...prev]);
        }

        // Refresh summary counts
        getStationSummary(targetStation)
          .then(sumRes => setSummary(sumRes?.summary || {}))
          .catch(() => {});
      }

      return res;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to consume stock';
      return { success: false, error: msg };
    }
  }, [stationId, batches, transactions, fetchItemBatches]);

  // ── Fetch transaction history ──────────────────────────────────────────────
  const fetchTransactions = useCallback(async (sid, params = {}) => {
    const targetStation = resolveTargetStation(sid) || resolveTargetStation(stationId);
    if (!targetStation) return;

    setTxLoading(true);
    try {
      const res = await fetchTransactionsApi(targetStation, params);
      setTransactions(res?.transactions || []);
      return res;
    } catch (err) {
      console.error('[InventoryContext] fetchTransactions:', err.message);
      return { transactions: [] };
    } finally {
      setTxLoading(false);
    }
  }, [stationId]);

  // ── HQ: fetch all stations ─────────────────────────────────────────────────
  const fetchAllStations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllStationsInventory();
      setHqStations(res?.stations || []);
      return res?.stations || [];
    } catch (err) {
      console.error('[InventoryContext] fetchAllStations:', err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Select an item (opens batch panel) ────────────────────────────────────
  const selectItem = useCallback((item) => {
    setSelectedItem(item);
    if (item && stationId) {
      const key = item.skuId || item.skuCode;
      fetchItemBatches(stationId, key);
    }
  }, [stationId, fetchItemBatches]);

  const clearSelectedItem = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const value = {
    // State
    inventory,
    batches,
    transactions,
    summary,
    hqStations,
    selectedItem,
    loading,
    batchLoading,
    txLoading,
    error,
    stationId,

    // Actions
    fetchInventory,
    refreshInventory,
    fetchItemBatches,
    consumeStock,
    fetchTransactions,
    fetchAllStations,
    selectItem,
    clearSelectedItem,
    setStationId,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

InventoryProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default InventoryProvider;
