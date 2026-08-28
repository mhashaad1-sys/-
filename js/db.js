// طبقة تخزين محلي على الهاتف باستخدام IndexedDB (لا يحتاج إنترنت ولا سيرفر)
const DB_NAME = 'ThoracicClinicDB';
const DB_VERSION = 1;
const STORE_PATIENTS = 'patients';
const STORE_IMAGES = 'images';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PATIENTS)) {
        const store = db.createObjectStore(STORE_PATIENTS, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        const imgStore = db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
        imgStore.createIndex('patientId', 'patientId', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const DB = {
  uid,

  async addPatient(patient) {
    const store = await tx(STORE_PATIENTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.add(patient);
      req.onsuccess = () => resolve(patient);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async updatePatient(patient) {
    const store = await tx(STORE_PATIENTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(patient);
      req.onsuccess = () => resolve(patient);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async getPatient(id) {
    const store = await tx(STORE_PATIENTS, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async getAllPatients() {
    const store = await tx(STORE_PATIENTS, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async deletePatient(id) {
    const imgs = await this.getImagesForPatient(id);
    const imgStore = await tx(STORE_IMAGES, 'readwrite');
    await Promise.all(imgs.map((img) => new Promise((resolve, reject) => {
      const req = imgStore.delete(img.id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    })));
    const store = await tx(STORE_PATIENTS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async addImage(image) {
    const store = await tx(STORE_IMAGES, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.add(image);
      req.onsuccess = () => resolve(image);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async deleteImage(id) {
    const store = await tx(STORE_IMAGES, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async getImagesForPatient(patientId) {
    const store = await tx(STORE_IMAGES, 'readonly');
    return new Promise((resolve, reject) => {
      const idx = store.index('patientId');
      const req = idx.getAll(patientId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async exportAll() {
    const patients = await this.getAllPatients();
    const images = await Promise.all(patients.map((p) => this.getImagesForPatient(p.id)));
    return {
      exportedAt: new Date().toISOString(),
      patients,
      images: images.flat(),
    };
  },

  async importAll(data) {
    const pStore = await tx(STORE_PATIENTS, 'readwrite');
    for (const p of data.patients || []) {
      pStore.put(p);
    }
    const iStore = await tx(STORE_IMAGES, 'readwrite');
    for (const img of data.images || []) {
      iStore.put(img);
    }
  },
};
