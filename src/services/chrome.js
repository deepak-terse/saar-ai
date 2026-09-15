export const extractActiveTabContent = () => chrome.runtime.sendMessage({ type: "EXTRACT_CONTENT" });

export const getSessionValue = async (key) => {
  try {
    const result = await chrome.storage.session.get(key);
    return result[key];
  } catch {
    return undefined;
  }
}

export const setSessionValue = async (key, value) => chrome.storage.session.set({ [key]: value });