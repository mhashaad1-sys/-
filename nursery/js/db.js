// طبقة التخزين المحلي (IndexedDB) - كل البيانات على الجهاز فقط
const DB_NAME = 'nursery-db';
const DB_VERSION = 4;
const STORES = ['settings', 'classes', 'children', 'attendance', 'payments', 'expenses', 'staff', 'notes', 'staffAtt', 'staffTx', 'schedule', 'requests', 'announcements', 'reports', 'homework', 'hwProg'];

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      STORES.forEach((s) => {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

const DB = {
  STORES,
  getAll: (store) => tx(store, 'readonly', (s) => s.getAll()),
  put: (store, obj) => tx(store, 'readwrite', (s) => s.put(obj)),
  del: (store, id) => tx(store, 'readwrite', (s) => s.delete(id)),
  clear: (store) => tx(store, 'readwrite', (s) => s.clear()),
  async exportAll() {
    const out = { app: 'nursery', version: DB_VERSION, exportedAt: new Date().toISOString(), data: {} };
    for (const s of STORES) out.data[s] = await DB.getAll(s);
    return out;
  },
  async importAll(json) {
    if (!json || json.app !== 'nursery' || !json.data) throw new Error('ملف غير صالح');
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORES, 'readwrite');
      STORES.forEach((s) => {
        const os = t.objectStore(s);
        os.clear();
        (json.data[s] || []).forEach((row) => os.put(row));
      });
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error);
    });
  },
};
