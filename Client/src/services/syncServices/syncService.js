import api from '@/api/axiosInstance';

import {
  getPendingEvents,
  markEventSynced
} from "./queueService";

let syncing = false;

/**
 * Handle INVENTORY_CONSUMPTION offline events.
 * Calls POST /api/inventory/:stationId/consume for each queued event.
 */
const syncInventoryConsumption = async (event) => {
  if (!event.stationId) throw new Error('Missing stationId in inventory event');
  const payload = {
    skuId: event.skuId,
    skuCode: event.skuCode,
    quantity: event.quantity,
    reason: event.reason,
    notes: event.notes,
    offlineCreated: true,
  };
  // Backend enforces FCFS and validates stock server-side
  const res = await api.post(`/inventory/${event.stationId}/consume`, payload);
  return res;
};

/**
 * Handle CARGO_RECEIVE offline events.
 * Calls POST /api/cargo/receiving for each queued receipt.
 */
const syncCargoReceive = async (event) => {
  const payload = {
    manifestId: event.manifestId,
    itemCode: event.itemCode,
    boxCode: event.boxCode || event.itemCode,
    acceptedQuantity: event.acceptedQuantity,
    remarks: event.remarks,
    skipCheckpointCheck: true,
  };
  return await api.post('/cargo/receiving', payload);
};

/**
 * Handle FIELD_CHECKIN offline events.
 * Calls POST /api/field-excursions/:excursionId/check-ins.
 */
const syncFieldCheckIn = async (event) => {
  if (!event.excursionId) throw new Error('Missing excursionId in field check-in event');
  const payload = {
    location: event.location,
    latitude: event.latitude || event.location?.latitude || event.location?.lat,
    longitude: event.longitude || event.location?.longitude || event.location?.lng,
    temperature: event.temperature,
    batteryLevel: event.batteryLevel,
    networkAvailable: false,
    notes: event.notes,
    deviceId: event.deviceId,
    eventId: event.eventId,
    offlineCreated: true
  };
  return await api.post(`/field-excursions/${event.excursionId}/check-ins`, payload);
};

/**
 * Route a queued event to the appropriate sync handler.
 * Add new event types here as the system grows.
 */
const routeEvent = async (event) => {
  switch (event.type) {
    case 'INVENTORY_CONSUMPTION':
      return await syncInventoryConsumption(event);
    case 'CARGO_RECEIVE':
      return await syncCargoReceive(event);
    case 'FIELD_CHECKIN':
      return await syncFieldCheckIn(event);
    default:
      // For unknown types, attempt generic /sync endpoint
      return await api.post('/sync', { events: [event] });
  }
};

// Sync all LOCAL events to MongoDB
export const syncOfflineQueue = async () => {

  if (syncing) return;

  if (!navigator.onLine) return;

  syncing = true;

  try {

    const pendingEvents = await getPendingEvents();

    if (pendingEvents.length === 0) {
      return;
    }

    console.log(`[Sync] Processing ${pendingEvents.length} offline event(s)...`);

    // Group events: sequential handlers (FCFS consumption, cargo receipts, field check-ins) vs bulk /sync
    const individualTypes = ['INVENTORY_CONSUMPTION', 'CARGO_RECEIVE', 'FIELD_CHECKIN'];
    const individualEvents = pendingEvents.filter(e => individualTypes.includes(e.type));
    const otherEvents = pendingEvents.filter(e => !individualTypes.includes(e.type));

    // Process individual events one-by-one in order
    for (const event of individualEvents) {
      try {
        await routeEvent(event);
        await markEventSynced(event);
        console.log(`[Sync] ${event.type} synced successfully`);
      } catch (err) {
        console.warn(`[Sync] Failed to sync ${event.type} event ${event._id}:`, err.message);
        // Don't stop — attempt remaining events
      }
    }

    // Process remaining events via generic /sync endpoint
    if (otherEvents.length > 0) {
      try {
        const response = await api.post("/sync", {
          events: otherEvents
        });

        const syncedEvents = response.data?.synced || response.synced || [];

        for (const syncedEvent of syncedEvents) {
          const localDoc = otherEvents.find(
            event => event.eventId === syncedEvent.eventId
          );
          if (localDoc) {
            await markEventSynced(localDoc);
          }
        }

        console.log(`[Sync] ${syncedEvents.length} general events synced.`);
      } catch (err) {
        console.error('[Sync] General sync failed:', err.message);
      }
    }

  } catch (error) {

    console.error("[Sync] Sync process failed:", error);

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
    }, 30000);
  }
};

export const stopSyncListener = () => {
  window.removeEventListener("online", onOnlineHandler);
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
};