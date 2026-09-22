const hasChromeSession = () => typeof chrome !== "undefined" && Boolean(chrome.storage?.session);

const listeners = new Set();
const memoryCache = new Map();

const notifyListeners = (key, value) => {
  listeners.forEach((fn) => {
    try {
      fn(key, value);
    } catch (err) {
      console.warn("Session storage listener error:", err);
    }
  });
};

if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "session") {
      Object.entries(changes).forEach(([k, change]) => {
        if (change.newValue === undefined) {
          memoryCache.delete(k);
        } else {
          memoryCache.set(k, change.newValue);
        }
        notifyListeners(k, change.newValue);
      });
    }
  });
}

export const getSessionItemSync = (key) => {
  if (!key) return undefined;
  if (memoryCache.has(key)) return memoryCache.get(key);
  if (typeof sessionStorage !== "undefined") {
    const raw = sessionStorage.getItem(key);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        memoryCache.set(key, parsed);
        return parsed;
      } catch {
        memoryCache.set(key, raw);
        return raw;
      }
    }
  }
  return undefined;
};

export const getSessionItem = async (key) => {
  if (!key) return undefined;
  if (memoryCache.has(key)) return memoryCache.get(key);
  if (hasChromeSession()) {
    const res = await chrome.storage.session.get(key);
    const val = res?.[key];
    if (val !== undefined) memoryCache.set(key, val);
    return val;
  }
  return getSessionItemSync(key);
};

export const setSessionItem = async (key, value) => {
  if (!key) return;
  memoryCache.set(key, value);
  if (hasChromeSession()) {
    await chrome.storage.session.set({ [key]: value });
    return;
  }
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    notifyListeners(key, value);
  }
};

export const removeSessionItem = async (key) => {
  if (!key) return;
  memoryCache.delete(key);
  if (hasChromeSession()) {
    await chrome.storage.session.remove(key);
    return;
  }
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(key);
    notifyListeners(key, undefined);
  }
};

export const subscribeSessionStorage = (key, callback) => {
  const handler = (changedKey, val) => {
    if (changedKey === key) callback(val);
  };
  listeners.add(handler);
  return () => listeners.delete(handler);
};
