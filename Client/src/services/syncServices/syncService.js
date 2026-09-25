import api from "../../api/axiosInstance";

import {
  getPendingEvents,
  markEventSynced
} from "./queueService";

let syncing = false;

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

    const response = await api.post("/sync", {
      events: pendingEvents
    });

    const syncedEvents = response.data.synced || [];

    for (const syncedEvent of syncedEvents) {

      const localDoc = pendingEvents.find(
        event => event.eventId === syncedEvent.eventId
      );

      if (localDoc) {
        await markEventSynced(localDoc);
      }

    }

    console.log(`Synced ${syncedEvents.length} events.`);

  } catch (error) {

    console.error("Offline Sync Failed:", error);

  } finally {

    syncing = false;

  }

};

// Start automatic sync when internet returns
export const startSyncListener = () => {

  window.addEventListener("online", syncOfflineQueue);

};

// Remove listener
export const stopSyncListener = () => {

  window.removeEventListener("online", syncOfflineQueue);

};