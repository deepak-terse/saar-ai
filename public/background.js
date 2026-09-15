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
      func: extractReadableContent,
    });

    return { ok: true, tabId: tab.id, ...result };
  } catch (err) {
    console.error("Saar AI extraction failed:", err);
    return { ok: false, error: err?.message || String(err) };
  }
}

// This function is serialized by chrome.scripting, so it must be self-contained.
const extractReadableContent = () => {
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "NAV", "HEADER", "FOOTER", "ASIDE",
    "FORM", "SVG", "BUTTON", "TEMPLATE", "IFRAME", "DIALOG",
  ]);

  const isHidden = (el) => {
    if (!(el instanceof Element)) return false;
    if (el.hasAttribute("aria-hidden")) return true;
    const style = window.getComputedStyle(el);
    return style.display === "none" || style.visibility === "hidden";
  }

  const collectText = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        let el = node.parentElement;
        while (el && el !== root.parentElement) {
          if (SKIP_TAGS.has(el.tagName) || isHidden(el)) return NodeFilter.FILTER_REJECT;
          el = el.parentElement;
        }
        return node.textContent.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    const parts = [];
    let node;
    while ((node = walker.nextNode())) parts.push(node.textContent.trim());
    return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  const pickRoot = () => {
    const direct = document.querySelector("article, main, [role='main']");
    if (direct) return direct;

    const candidates = document.querySelectorAll("body div, body section");
    let best = document.body;
    let bestScore = 0;

    for (const el of candidates) {
      if (isHidden(el)) continue;
      const textLen = (el.textContent || "").trim().length;
      if (textLen < 200) continue;
      const tagCount = el.querySelectorAll("*").length || 1;
      const score = textLen / tagCount;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  const MAX_CHARS = 12000;
  const root = pickRoot();
  const fullText = collectText(root);
  const truncated = fullText.length > MAX_CHARS;

  return {
    title: document.title,
    url: location.href,
    text: truncated ? fullText.slice(0, MAX_CHARS) : fullText,
    truncated,
    wordCount: fullText.split(/\s+/).filter(Boolean).length,
  };
}