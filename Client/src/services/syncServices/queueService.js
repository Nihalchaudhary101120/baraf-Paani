import offlineDB from './pouchService';

// Generate a UUID that works in all browsers
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Queue an offline event to PouchDB.
 * @param {Object} event - The event payload (type, data fields)
 * @returns {Object} the saved document
 */
export const queueEvent = async (event) => {
  const document = {
    _id: generateId(),
    eventId: generateId(),
    ...event,
    syncStatus: 'LOCAL',
    createdAt: new Date().toISOString(),
  };

  await offlineDB.put(document);
  return document;
};

/**
 * Get all events with syncStatus === 'LOCAL'
 */
export const getPendingEvents = async () => {
  const docs = await offlineDB.allDocs({ include_docs: true });
  return docs.rows
    .map(row => row.doc)
    .filter(doc => doc.syncStatus === 'LOCAL');
};

/**
 * Mark an event as synced
 */
export const markEventSynced = async (doc) => {
  await offlineDB.put({
    ...doc,
    syncStatus: 'SYNCED',
  });
};
