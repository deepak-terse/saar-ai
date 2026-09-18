chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "EXTRACT_CONTENT") {
    extractFromActiveTab().then(sendResponse);
    return true;
  }
});

const extractFromActiveTab = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return { ok: false, error: "no-active-tab" };

    if (!/^https?:\/\//.test(tab.url ?? "")) {
      return { ok: false, error: "unsupported-page", tabId: tab.id, url: tab.url };
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/extractor.js"],
    });

    return { ok: true, tabId: tab.id, ...result };
  } catch (err) {
    console.error("Saar AI extraction failed:", err);
    return { ok: false, error: err?.message || String(err) };
  }
}