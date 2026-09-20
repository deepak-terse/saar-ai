const DB_NAME = "saar_db";
const DB_VERSION = 1;
const STORE_NAME = "pages";

const listeners = new Set();

const notifyListeners = (key, value) => {
  listeners.forEach((fn) => {
    try {
      fn(key, value);
    } catch (err) {
      console.warn("IndexedDB listener error:", err);
    }
  });
};

export const openDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB not available"));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getPage = async (url) => {
  if (!url) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB getPage error:", err);
    return null;
  }
};

export const savePage = async (pageData) => {
  if (!pageData?.url) return null;
  try {
    const db = await openDB();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(pageData);
      req.onsuccess = () => resolve(pageData);
      req.onerror = () => reject(req.error);
    });
    notifyListeners(pageData.url, pageData);
    return result;
  } catch (err) {
    console.warn("IndexedDB savePage error:", err);
    return null;
  }
};

export const deletePage = async (url) => {
  if (!url) return;
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(url);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    notifyListeners(url, null);
  } catch (err) {
    console.warn("IndexedDB deletePage error:", err);
  }
};

export const getAllPages = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB getAllPages error:", err);
    return [];
  }
};

export const getIndexDBItem = (key) => getPage(key);

export const setIndexDBItem = (key, value) => {
  const record = value && typeof value === "object" ? { ...value, url: key } : value;
  return savePage(record);
};

export const removeIndexDBItem = (key) => deletePage(key);

export const subscribeIndexedDB = (key, callback) => {
  const handler = (changedKey, val) => {
    if (changedKey === key) callback(val);
  };
  listeners.add(handler);
  return () => listeners.delete(handler);
};
