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
		let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

		if (!tab?.id) return { ok: false, error: "no-active-tab" };
		if (!/^https?:\/\//.test(tab.url ?? "")) return { ok: false, error: "unsupported", tabId: tab.id, url: tab.url };

		const [{ result }] = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ["content/extractor.js"],
		});

		if (!result || !result.ok) return { ok: false, error: "empty-content", tabId: tab.id };
		return { ok: true, tabId: tab.id, ...result };
	} catch (err) {
		return { ok: false, error: err?.message || String(err) };
	}
}