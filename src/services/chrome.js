export async function extractActiveTabContent() {
  return chrome.runtime.sendMessage({ type: "EXTRACT_CONTENT" });
}

export async function getSessionValue(key) {
  try {
    const result = await chrome.storage.session.get(key);
    return result[key];
  } catch {
    return undefined;
  }
}

export async function setSessionValue(key, value) {
  await chrome.storage.session.set({ [key]: value });
}