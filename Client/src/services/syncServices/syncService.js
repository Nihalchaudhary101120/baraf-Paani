import api from '@/api/axiosInstance';
import {
  getPendingEvents,
  markEventSyncing,
  markEventSynced,
  markEventFailed,
} from "./queueService";

let syncing = false;

/**
 * Handle INVENTORY_CONSUMPTION offline events.
 * Calls POST /api/inventory/:stationId/consume for each queued event.
 */
const syncInventoryConsumption = async (event) => {
  const payloadData = event.payload || event;
  const stationId = payloadData.stationId || event.stationId;
  if (!stationId) throw new Error('Missing stationId in inventory event');
  const payload = {
    skuId: payloadData.skuId,
    skuCode: payloadData.skuCode,
    quantity: payloadData.quantity,
    reason: payloadData.reason,
    notes: payloadData.notes,
    eventId: event.eventId, // Stable eventId for backend idempotency
    offlineCreated: true,
  };
  return await api.post(`/inventory/${stationId}/consume`, payload);
};

/**
 * Handle CARGO_RECEIVE offline events.
 * Calls POST /api/cargo/receiving for each queued receipt.
 */
const syncCargoReceive = async (event) => {
  const payloadData = event.payload || event;
  const payload = {
    manifestId: payloadData.manifestId,
    itemCode: payloadData.itemCode,
    boxCode: payloadData.boxCode || payloadData.itemCode,
    acceptedQuantity: payloadData.acceptedQuantity,
    remarks: payloadData.remarks,
    skipCheckpointCheck: true,
  };
  return await api.post('/cargo/receiving', payload);
};

/**
 * Handle FIELD_CHECK_IN / FIELD_CHECKIN offline events.
 * Calls POST /api/field-excursions/:excursionId/check-ins.
 * Preserves the original stable eventId, creation timestamp, and location.
 */
const syncFieldCheckIn = async (event) => {
  const payloadData = event.payload || event;
  const excursionId = payloadData.excursionId || event.excursionId;
  if (!excursionId) throw new Error('Missing excursionId in field check-in event');

  const loc = payloadData.location || {
    latitude: payloadData.latitude ?? 0,
    longitude: payloadData.longitude ?? 0,
  };

  const payload = {
    location: {
      latitude: Number(loc.latitude ?? loc.lat ?? 0),
      longitude: Number(loc.longitude ?? loc.lng ?? 0),
    },
    latitude: Number(loc.latitude ?? loc.lat ?? 0),
    longitude: Number(loc.longitude ?? loc.lng ?? 0),
    temperature: payloadData.temperature !== undefined && payloadData.temperature !== '' ? Number(payloadData.temperature) : null,
    batteryLevel: payloadData.batteryLevel !== undefined && payloadData.batteryLevel !== '' ? Number(payloadData.batteryLevel) : null,
    networkAvailable: false,
    notes: payloadData.notes || '',
    deviceId: payloadData.deviceId || 'offline-device',
    eventId: event.eventId, // MUST remain identical across retries
    offlineCreated: true,
  };

  return await api.post(`/field-excursions/${excursionId}/check-ins`, payload);
};

/**
 * Route a queued event to the appropriate sync handler.
 */
const routeEvent = async (event) => {
  switch (event.type) {
    case 'INVENTORY_CONSUMPTION':
      return await syncInventoryConsumption(event);
    case 'CARGO_RECEIVE':
      return await syncCargoReceive(event);
    case 'FIELD_CHECK_IN':
    case 'FIELD_CHECKIN':
      return await syncFieldCheckIn(event);
    default:
      return await api.post('/sync', { events: [event] });
  }
};

/**
 * Sync all PENDING events to MongoDB in creation order (FIFO).
 */
export const syncOfflineQueue = async () => {
  if (syncing) return;
  if (!navigator.onLine) return;

  syncing = true;

  try {
    const pendingEvents = await getPendingEvents();
    if (pendingEvents.length === 0) {
      return;
    }

    console.log(`[Sync] Processing ${pendingEvents.length} offline event(s) in FIFO order...`);

    const individualTypes = ['INVENTORY_CONSUMPTION', 'CARGO_RECEIVE', 'FIELD_CHECK_IN', 'FIELD_CHECKIN'];
    const individualEvents = pendingEvents.filter(e => individualTypes.includes(e.type));
    const otherEvents = pendingEvents.filter(e => !individualTypes.includes(e.type));

    let checkInsSynced = 0;
    let inventorySynced = 0;

    // Process individual events sequentially in chronological order
    for (const event of individualEvents) {
      try {
        await markEventSyncing(event);
        await routeEvent(event);
        await markEventSynced(event);
        if (['FIELD_CHECK_IN', 'FIELD_CHECKIN'].includes(event.type)) {
          checkInsSynced++;
        }
        if (event.type === 'INVENTORY_CONSUMPTION') {
          inventorySynced++;
        }
        console.log(`[Sync] ${event.type} (${event.eventId}) synced successfully`);
      } catch (err) {
        const status = err.response?.status;
        const errMsg = err.response?.data?.message || err.message || 'Sync failed';
        console.warn(`[Sync] Error syncing ${event.type} (${event.eventId}):`, errMsg);

        // Check if permanent validation error (400, 401, 403, 404, 422)
        const isPermanent = status >= 400 && status < 500 && status !== 408 && status !== 429;
        await markEventFailed(event, errMsg, isPermanent);

        // Broadcast event for UI notifications
        window.dispatchEvent(new CustomEvent('nirantra:sync-error', {
          detail: { event, error: errMsg, isPermanent }
        }));
      }
    }

    // Process remaining generic events via /sync
    if (otherEvents.length > 0) {
      try {
        const response = await api.post("/sync", { events: otherEvents });
        const syncedEvents = response.data?.synced || response.synced || [];
        for (const syncedEvent of syncedEvents) {
          const localDoc = otherEvents.find(e => e.eventId === syncedEvent.eventId);
          if (localDoc) {
            await markEventSynced(localDoc);
          }
        }
      } catch (err) {
        console.error('[Sync] Generic sync failed:', err.message);
      }
    }

    // Dispatch sync completion event for UI refresh
    window.dispatchEvent(new CustomEvent('nirantra:sync-complete', {
      detail: { count: pendingEvents.length, checkInsSynced, inventorySynced }
    }));

  } catch (error) {
    console.error("[Sync] Sync queue error:", error);
  } finally {
    syncing = false;
  }
};

let syncInterval = null;

const onOnlineHandler = () => {
  console.log("[Sync] Network restored — triggering syncOfflineQueue...");
  syncOfflineQueue();
};

export const startSyncListener = () => {
  window.addEventListener("online", onOnlineHandler);
  if (!syncInterval) {
    syncInterval = setInterval(() => {
      if (navigator.onLine) {
        syncOfflineQueue();
      }
    }, 20000); // 20s heartbeat
  }
};

export const stopSyncListener = () => {
  window.removeEventListener("online", onOnlineHandler);
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
};