import offlineDB from './pouchService';

// Generate a UUID that works in all browsers
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Generate a human-readable, stable check-in eventId: CHK-YYYY-TIMESTAMP-RANDOM
 */
export const generateCheckInEventId = () => {
  const year = new Date().getFullYear();
  const time = Date.now().toString().slice(-6);
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CHK-${year}-${time}-${rand}`;
};

/**
 * Queue an offline event to PouchDB (backed by IndexedDB).
 * @param {Object} event - The event payload (type, data fields, payload)
 * @returns {Object} the saved document
 */
export const queueEvent = async (event) => {
  const eventId = event.eventId || (
    ['FIELD_CHECK_IN', 'FIELD_CHECKIN'].includes(event.type)
      ? generateCheckInEventId()
      : generateId()
  );

  const document = {
    _id: event._id || eventId,
    eventId,
    type: event.type,
    payload: event.payload || event,
    ...event,
    status: 'PENDING',
    syncStatus: 'PENDING',
    retryCount: event.retryCount || 0,
    createdAt: event.createdAt || new Date().toISOString(),
  };

  await offlineDB.put(document);
  return document;
};

/**
 * Get all pending events in chronological order (FIFO).
 * Finds events with status === 'PENDING' or syncStatus === 'LOCAL' / 'PENDING'
 */
export const getPendingEvents = async () => {
  try {
    const docs = await offlineDB.allDocs({ include_docs: true });
    const pending = docs.rows
      .map(row => row.doc)
      .filter(doc => (
        doc.status === 'PENDING' ||
        doc.syncStatus === 'PENDING' ||
        doc.syncStatus === 'LOCAL'
      ));

    // Sort oldest first (FIFO) to preserve operational chronological order
    pending.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    return pending;
  } catch (err) {
    console.error('getPendingEvents error:', err);
    return [];
  }
};

/**
 * Mark an event as SYNCING while in-flight
 */
export const markEventSyncing = async (doc) => {
  try {
    const existing = await offlineDB.get(doc._id);
    const updated = {
      ...existing,
      status: 'SYNCING',
      syncStatus: 'SYNCING',
      syncingAt: new Date().toISOString(),
    };
    await offlineDB.put(updated);
    return updated;
  } catch (err) {
    console.warn('markEventSyncing error:', err.message);
    return doc;
  }
};

/**
 * Mark an event as SYNCED upon backend confirmation
 */
export const markEventSynced = async (doc) => {
  try {
    const existing = await offlineDB.get(doc._id);
    const updated = {
      ...existing,
      status: 'SYNCED',
      syncStatus: 'SYNCED',
      syncedAt: new Date().toISOString(),
    };
    await offlineDB.put(updated);
    return updated;
  } catch (err) {
    console.warn('markEventSynced error:', err.message);
    return doc;
  }
};

/**
 * Mark an event as FAILED (permanent) or reset to PENDING with incremented retryCount
 */
export const markEventFailed = async (doc, errorMessage, isPermanent = false) => {
  try {
    const existing = await offlineDB.get(doc._id);
    const updated = {
      ...existing,
      status: isPermanent ? 'FAILED' : 'PENDING',
      syncStatus: isPermanent ? 'FAILED' : 'PENDING',
      retryCount: (existing.retryCount || 0) + (isPermanent ? 0 : 1),
      lastError: errorMessage,
      failedAt: isPermanent ? new Date().toISOString() : undefined,
    };
    await offlineDB.put(updated);
    return updated;
  } catch (err) {
    console.warn('markEventFailed error:', err.message);
    return doc;
  }
};

/**
 * Fetch all check-in events (PENDING, SYNCING, SYNCED, FAILED) for diagnostics/monitoring
 */
export const getCheckInQueue = async (excursionId = null) => {
  try {
    const docs = await offlineDB.allDocs({ include_docs: true });
    return docs.rows
      .map(row => row.doc)
      .filter(doc => {
        const isCheckIn = ['FIELD_CHECK_IN', 'FIELD_CHECKIN'].includes(doc.type);
        if (!isCheckIn) return false;
        if (excursionId) {
          const excId = doc.excursionId || doc.payload?.excursionId;
          return excId === excursionId;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch (err) {
    console.error('getCheckInQueue error:', err);
    return [];
  }
};
