const hasChromeLocal = () => typeof chrome !== "undefined" && Boolean(chrome.storage?.local);

const listeners = new Set();

const notifyListeners = (key, value) => {
  listeners.forEach((fn) => {
    try {
      fn(key, value);
    } catch (err) {
      console.warn("Local storage listener error:", err);
    }
  });
};

if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      Object.entries(changes).forEach(([k, change]) => {
        notifyListeners(k, change.newValue);
      });
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key) {
      try {
        notifyListeners(e.key, JSON.parse(e.newValue));
      } catch {
        notifyListeners(e.key, e.newValue);
      }
    }
  });
}

export const getLocalItem = async (key) => {
  if (!key) return undefined;
  if (hasChromeLocal()) {
    const res = await chrome.storage.local.get(key);
    return res?.[key];
  }
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
  }
  return undefined;
};

export const setLocalItem = async (key, value) => {
  if (!key) return;
  if (hasChromeLocal()) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    notifyListeners(key, value);
  }
};

export const removeLocalItem = async (key) => {
  if (!key) return;
  if (hasChromeLocal()) {
    await chrome.storage.local.remove(key);
    return;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
    notifyListeners(key, undefined);
  }
};

export const subscribeLocalStorage = (key, callback) => {
  const handler = (changedKey, val) => {
    if (changedKey === key) callback(val);
  };
  listeners.add(handler);
  return () => listeners.delete(handler);
};
