/**
 * PouchDB offline event store.
 * Uses a lazy-initialization pattern to avoid ESM/CJS incompatibility with Vite 8.
 */

let _db = null;

const getDB = async () => {
  if (_db) return _db;
  // Dynamic import avoids Vite's static ESM analysis of pouchdb-browser
  const PouchDB = (await import('pouchdb-browser')).default;
  _db = new PouchDB('nirantra-offline-events');
  return _db;
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