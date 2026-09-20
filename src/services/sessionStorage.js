const hasChromeSession = () => typeof chrome !== "undefined" && Boolean(chrome.storage?.session);

const listeners = new Set();

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
        notifyListeners(k, change.newValue);
      });
    }
  });
}

export const getSessionItem = async (key) => {
  if (!key) return undefined;
  if (hasChromeSession()) {
    const res = await chrome.storage.session.get(key);
    return res?.[key];
  }
  if (typeof sessionStorage !== "undefined") {
    const raw = sessionStorage.getItem(key);
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

export const setSessionItem = async (key, value) => {
  if (!key) return;
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
