/**
 * PouchDB offline event store.
 * Uses a lazy-initialization pattern to avoid ESM/CJS incompatibility with Vite 8.
 */

let _db = null;

const getDB = async () => {
  if (_db) return _db;
  try {
    const PouchDBModule = await import('pouchdb-browser');
    const PouchDB = PouchDBModule.default || PouchDBModule;
    _db = new PouchDB('nirantra-offline-events');
    return _db;
  } catch (err) {
    console.warn('[pouchService] Failed to initialize PouchDB for events, using fallback:', err.message);
    // Provide a memory/dummy fallback object so queue operations never crash
    return {
      put: async () => ({ ok: true }),
      allDocs: async () => ({ rows: [] }),
      get: async () => { throw { status: 404 }; },
      remove: async () => ({ ok: true }),
    };
  }
};

/**
 * A Proxy-based offlineDB that lazily initializes PouchDB on first use.
 * Supports .put(), .allDocs(), .get() etc. via async wrapper.
 */
const offlineDB = {
  put: async (...args) => (await getDB()).put(...args),
  allDocs: async (...args) => (await getDB()).allDocs(...args),
  get: async (...args) => (await getDB()).get(...args),
  remove: async (...args) => (await getDB()).remove(...args),
};

export default offlineDB;