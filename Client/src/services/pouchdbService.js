/**
 * PouchDB Service for NIRANTRA Offline-First SOS System
 * Database: 'nirantra_offline'
 * Provides reliable browser-side IndexedDB persistence for offline emergency queueing and draft preservation.
 */

// LocalStorage fallback keys for extra resilience
const LS_QUEUE_KEY = 'nirantra_offline_sos_queue';
const LS_DRAFT_KEY = 'nirantra_offline_sos_draft';

let _db = null;

const getLocalStorageQueue = () => {
  try {
    const raw = localStorage.getItem(LS_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalStorageQueue = (queue) => {
  try {
    localStorage.setItem(LS_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[PouchDBService] LocalStorage save warn:', e.message);
  }
};

export const getOfflineDB = async () => {
  if (_db) return _db;
  try {
    // Dynamic import avoids Vite's static ESM analysis of pouchdb-browser
    const PouchDBModule = await import('pouchdb-browser');
    const PouchDB = PouchDBModule.default || PouchDBModule;
    _db = new PouchDB('nirantra_offline');
    return _db;
  } catch (err) {
    console.warn('[PouchDBService] PouchDB instantiation error, using fallback:', err.message);
    return null;
  }
};

/**
 * Save an SOS record to PouchDB offline queue.
 * Handles both new creation and updating existing documents.
 */
export const saveOfflineSOS = async (sosDoc) => {
  const id = sosDoc._id || `sos-${sosDoc.clientIncidentId}`;
  const docToSave = {
    ...sosDoc,
    _id: id,
    type: 'SOS',
    syncStatus: sosDoc.syncStatus || 'PENDING_SYNC',
    syncAttempts: sosDoc.syncAttempts || 0,
    createdAt: sosDoc.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 1. Always ensure mirrored in fallback localStorage queue
  try {
    const queue = getLocalStorageQueue();
    const existingIdx = queue.findIndex(item => item._id === id || item.clientIncidentId === sosDoc.clientIncidentId);
    if (existingIdx >= 0) {
      queue[existingIdx] = { ...queue[existingIdx], ...docToSave };
    } else {
      queue.push(docToSave);
    }
    saveLocalStorageQueue(queue);
  } catch (lsErr) {
    console.warn('[PouchDBService] Fallback storage warning:', lsErr);
  }

  // 2. Persist to PouchDB IndexedDB
  try {
    const db = await getOfflineDB();
    if (db) {
      let rev = undefined;
      try {
        const existing = await db.get(id);
        rev = existing._rev;
      } catch (notFoundErr) {
        if (notFoundErr.status !== 404) {
          console.warn('[PouchDBService] get check warn:', notFoundErr);
        }
      }
      const response = await db.put({ ...docToSave, _rev: rev });
      return { ...docToSave, _rev: response.rev };
    }
  } catch (err) {
    console.warn('[PouchDBService] Error saving to PouchDB (saved in fallback):', err.message);
  }

  return docToSave;
};

/**
 * Update the synchronization status and server details of an offline SOS record.
 */
export const updateSOSSyncStatus = async (id, status, details = {}) => {
  const docId = id.startsWith('sos-') ? id : `sos-${id}`;

  // 1. Update localStorage fallback
  try {
    const queue = getLocalStorageQueue();
    const idx = queue.findIndex(item => item._id === docId || item.clientIncidentId === id.replace('sos-', ''));
    if (idx >= 0) {
      queue[idx] = {
        ...queue[idx],
        ...details,
        syncStatus: status,
        updatedAt: new Date().toISOString()
      };
      if (status === 'SYNCED') {
        queue[idx].syncedAt = new Date().toISOString();
        queue[idx].lastSyncError = null;
      } else if (status === 'FAILED') {
        queue[idx].syncAttempts = (queue[idx].syncAttempts || 0) + 1;
        queue[idx].lastSyncAttempt = new Date().toISOString();
        queue[idx].lastSyncError = details.error || 'Network error';
      }
      saveLocalStorageQueue(queue);
    }
  } catch (lsErr) {
    console.warn('[PouchDBService] LocalStorage sync update warning:', lsErr);
  }

  // 2. Update PouchDB
  try {
    const db = await getOfflineDB();
    if (db) {
      const existing = await db.get(docId);
      const updated = {
        ...existing,
        ...details,
        syncStatus: status,
        updatedAt: new Date().toISOString()
      };

      if (status === 'SYNCED') {
        updated.syncedAt = new Date().toISOString();
        updated.lastSyncError = null;
      } else if (status === 'FAILED') {
        updated.syncAttempts = (existing.syncAttempts || 0) + 1;
        updated.lastSyncAttempt = new Date().toISOString();
        updated.lastSyncError = details.error || 'Network error';
      }

      const response = await db.put(updated);
      return { ...updated, _rev: response.rev };
    }
  } catch (err) {
    console.warn(`[PouchDBService] PouchDB update warn for ${docId}:`, err.message);
  }

  return { _id: docId, syncStatus: status, ...details };
};

/**
 * Retrieve all pending SOS records waiting for synchronization.
 */
export const getPendingSyncSOS = async () => {
  const map = new Map();

  // 1. Read from PouchDB
  try {
    const db = await getOfflineDB();
    if (db) {
      const result = await db.allDocs({ include_docs: true });
      result.rows.forEach(row => {
        const doc = row.doc;
        if (doc && doc.type === 'SOS' && (doc.syncStatus === 'PENDING_SYNC' || doc.syncStatus === 'FAILED')) {
          map.set(doc._id, doc);
        }
      });
    }
  } catch (err) {
    console.warn('[PouchDBService] PouchDB getPendingSyncSOS warn:', err.message);
  }

  // 2. Include any from localStorage
  try {
    const queue = getLocalStorageQueue();
    queue.forEach(doc => {
      if (doc && doc.type === 'SOS' && (doc.syncStatus === 'PENDING_SYNC' || doc.syncStatus === 'FAILED')) {
        if (!map.has(doc._id)) {
          map.set(doc._id, doc);
        }
      }
    });
  } catch (lsErr) {
    console.warn('[PouchDBService] LS getPendingSyncSOS warn:', lsErr);
  }

  return Array.from(map.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // FIFO queue
};

/**
 * Retrieve all SOS records in PouchDB (both pending and synced).
 */
export const getAllOfflineSOS = async () => {
  const map = new Map();

  try {
    const db = await getOfflineDB();
    if (db) {
      const result = await db.allDocs({ include_docs: true });
      result.rows.forEach(row => {
        const doc = row.doc;
        if (doc && doc.type === 'SOS') {
          map.set(doc._id, doc);
        }
      });
    }
  } catch (err) {
    console.warn('[PouchDBService] PouchDB getAllOfflineSOS warn:', err.message);
  }

  try {
    const queue = getLocalStorageQueue();
    queue.forEach(doc => {
      if (doc && doc.type === 'SOS' && !map.has(doc._id)) {
        map.set(doc._id, doc);
      }
    });
  } catch (lsErr) {
    console.warn('[PouchDBService] LS getAllOfflineSOS warn:', lsErr);
  }

  return Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Retrieve a specific SOS record by clientIncidentId.
 */
export const getSOSByClientId = async (clientIncidentId) => {
  const docId = `sos-${clientIncidentId}`;

  try {
    const db = await getOfflineDB();
    if (db) {
      return await db.get(docId);
    }
  } catch (err) {
    if (err.status !== 404) console.warn(err.message);
  }

  try {
    const queue = getLocalStorageQueue();
    return queue.find(d => d._id === docId || d.clientIncidentId === clientIncidentId) || null;
  } catch {
    return null;
  }
};

// ── DRAFT PERSISTENCE (SECTION 14) ──────────────────────────────────
const DRAFT_DOC_ID = 'draft_sos';

/**
 * Auto-save current SOS form draft to prevent loss during network failure or refresh.
 */
export const saveSOSDraft = async (draftData) => {
  const draftDoc = {
    _id: DRAFT_DOC_ID,
    type: 'DRAFT',
    ...draftData,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(draftDoc));
  } catch (e) {
    console.warn('[PouchDBService] Draft LS warn:', e.message);
  }

  try {
    const db = await getOfflineDB();
    if (db) {
      let rev = undefined;
      try {
        const existing = await db.get(DRAFT_DOC_ID);
        rev = existing._rev;
      } catch (e) {
        if (e.status !== 404) console.warn(e);
      }
      await db.put({ ...draftDoc, _rev: rev });
    }
  } catch (err) {
    console.warn('[PouchDBService] Unable to save draft to PouchDB:', err.message);
  }
};

/**
 * Load saved draft if present.
 */
export const getSOSDraft = async () => {
  try {
    const db = await getOfflineDB();
    if (db) {
      const doc = await db.get(DRAFT_DOC_ID);
      if (doc) return doc;
    }
  } catch (err) {
    // Check LS
  }

  try {
    const raw = localStorage.getItem(LS_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Clear the draft once successfully submitted.
 */
export const clearSOSDraft = async () => {
  try {
    localStorage.removeItem(LS_DRAFT_KEY);
  } catch {}

  try {
    const db = await getOfflineDB();
    if (db) {
      const existing = await db.get(DRAFT_DOC_ID);
      await db.remove(existing);
    }
  } catch (err) {
    // If not found, nothing to clear
  }
};

export default {
  getOfflineDB,
  saveOfflineSOS,
  updateSOSSyncStatus,
  getPendingSyncSOS,
  getAllOfflineSOS,
  getSOSByClientId,
  saveSOSDraft,
  getSOSDraft,
  clearSOSDraft
};
