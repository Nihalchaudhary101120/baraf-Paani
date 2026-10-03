/**
 * Offline Synchronization Service for NIRANTRA SOS
 * Manages background queue processing, network detection, backoff retries, and REST API transmission.
 */

import * as sosApi from '@/api/sos.api';
import {
  saveOfflineSOS,
  updateSOSSyncStatus,
  getPendingSyncSOS,
  getAllOfflineSOS
} from './pouchdbService';

export const NETWORK_STATUS = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  SERVER_UNREACHABLE: 'SERVER_UNREACHABLE',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED'
};

class OfflineSyncService {
  constructor() {
    this.status = typeof navigator !== 'undefined' && !navigator.onLine
      ? NETWORK_STATUS.OFFLINE
      : NETWORK_STATUS.ONLINE;

    this.isSyncing = false;
    this.listeners = new Set();
    this.retryTimeoutId = null;
    this.lastSuccessfulSync = null;
    this.lastSyncAttempt = null;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));

      // Periodic health check & sync poll every 30 seconds
      setInterval(() => {
        if (this.status !== NETWORK_STATUS.OFFLINE && !this.isSyncing) {
          this.syncPendingSOS();
        }
      }, 30000);
    }
  }

  /**
   * Subscribe to status and queue changes.
   * Listener receives: ({ status, pendingCount, isSyncing, lastSuccessfulSync })
   */
  subscribe(listener) {
    this.listeners.add(listener);
    // Send immediate snapshot
    this.getQueueSnapshot().then((snapshot) => listener(snapshot));
    return () => this.listeners.delete(listener);
  }

  notifyListeners(data = {}) {
    this.getQueueSnapshot().then((snapshot) => {
      const merged = { ...snapshot, ...data };
      this.listeners.forEach((listener) => {
        try {
          listener(merged);
        } catch (e) {
          console.error('[OfflineSyncService] Listener error:', e);
        }
      });
    });
  }

  async getQueueSnapshot() {
    const pendingList = await getPendingSyncSOS();
    return {
      status: this.status,
      pendingCount: pendingList.length,
      isSyncing: this.isSyncing,
      lastSuccessfulSync: this.lastSuccessfulSync,
      lastSyncAttempt: this.lastSyncAttempt
    };
  }

  async handleNetworkChange(isOnline) {
    if (!isOnline) {
      this.status = NETWORK_STATUS.OFFLINE;
      this.notifyListeners({ status: NETWORK_STATUS.OFFLINE });
      return;
    }

    // When network comes online, verify actual server reachability
    this.status = NETWORK_STATUS.ONLINE;
    this.notifyListeners({ status: NETWORK_STATUS.ONLINE });
    await this.syncPendingSOS();
  }

  /**
   * Test if the backend server is reachable.
   */
  async checkServerReachability() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.status = NETWORK_STATUS.OFFLINE;
      return false;
    }

    try {
      // Lightweight active query
      await sosApi.getActiveSOS({ limit: 1 });
      this.status = NETWORK_STATUS.ONLINE;
      return true;
    } catch (err) {
      if (!err.response) {
        // Network or connection refused
        this.status = NETWORK_STATUS.SERVER_UNREACHABLE;
        return false;
      }
      // If server responded with 401/403/500, the server IS reachable
      this.status = NETWORK_STATUS.ONLINE;
      return true;
    }
  }

  /**
   * Synchronize all pending offline SOS incidents.
   */
  async syncPendingSOS() {
    if (this.isSyncing) return { success: false, message: 'Sync already in progress' };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.status = NETWORK_STATUS.OFFLINE;
      this.notifyListeners({ status: NETWORK_STATUS.OFFLINE });
      return { success: false, message: 'Network is offline' };
    }

    const pendingDocs = await getPendingSyncSOS();
    if (pendingDocs.length === 0) {
      this.status = NETWORK_STATUS.SYNCED;
      this.notifyListeners({ status: NETWORK_STATUS.SYNCED });
      return { success: true, count: 0 };
    }

    this.isSyncing = true;
    this.status = NETWORK_STATUS.SYNCING;
    this.lastSyncAttempt = new Date();
    this.notifyListeners({ status: NETWORK_STATUS.SYNCING, isSyncing: true });

    let syncedCount = 0;
    let failedCount = 0;

    for (const doc of pendingDocs) {
      try {
        const payload = {
          clientIncidentId: doc.clientIncidentId,
          emergencyType: doc.emergencyType,
          severity: doc.severity,
          description: doc.description,
          latitude: doc.location?.latitude,
          longitude: doc.location?.longitude,
          accuracy: doc.location?.accuracy,
          addressOrDesc: doc.location?.addressOrDesc,
          stationId: doc.stationId,
          offlineCreated: true,
          syncStatus: 'PENDING_SYNC'
        };

        const res = await sosApi.createSOS(payload);
        const serverSos = res?.sos || res?.data?.sos;

        if (serverSos) {
          await updateSOSSyncStatus(doc._id, 'SYNCED', {
            serverIncidentId: serverSos._id,
            sosNumber: serverSos.sosNumber,
            syncedAt: new Date().toISOString()
          });
          syncedCount++;
        } else {
          throw new Error('Server did not return SOS record');
        }
      } catch (err) {
        failedCount++;
        console.warn(`[OfflineSyncService] Failed to sync ${doc._id}:`, err.message);

        const isNetworkErr = !err.response;
        await updateSOSSyncStatus(doc._id, 'FAILED', {
          error: err.response?.data?.message || err.message,
          lastSyncAttempt: new Date().toISOString()
        });

        if (isNetworkErr) {
          this.status = NETWORK_STATUS.SERVER_UNREACHABLE;
          // Break loop on connection failure to avoid rapid sequential failures
          break;
        }
      }
    }

    this.isSyncing = false;
    const remaining = await getPendingSyncSOS();

    if (remaining.length === 0) {
      this.status = NETWORK_STATUS.SYNCED;
      this.lastSuccessfulSync = new Date();
    } else if (this.status !== NETWORK_STATUS.SERVER_UNREACHABLE) {
      this.status = NETWORK_STATUS.ONLINE;
      // Schedule exponential/controlled retry
      this.scheduleRetry(remaining[0]?.syncAttempts || 1);
    }

    this.notifyListeners({
      status: this.status,
      isSyncing: false,
      syncedCount,
      failedCount,
      pendingCount: remaining.length
    });

    return {
      success: remaining.length === 0,
      syncedCount,
      failedCount,
      remainingCount: remaining.length
    };
  }

  scheduleRetry(attempts) {
    if (this.retryTimeoutId) clearTimeout(this.retryTimeoutId);

    // Backoff: 8s, 20s, 45s, max 60s
    const delayMs = Math.min(60000, Math.pow(attempts, 1.5) * 8000);
    this.retryTimeoutId = setTimeout(() => {
      this.syncPendingSOS();
    }, delayMs);
  }

  /**
   * Manual trigger from UI button: "SYNC NOW"
   */
  async syncNow() {
    if (this.retryTimeoutId) clearTimeout(this.retryTimeoutId);
    return await this.syncPendingSOS();
  }
}

export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;
