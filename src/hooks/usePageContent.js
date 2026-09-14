import { useCallback, useEffect, useState } from "react";
import { extractActiveTabContent } from "../services/chrome";

export function usePageContent({ onBeforeRefresh } = {}) {
  const [page, setPage] = useState(null);
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    onBeforeRefresh?.();
    setLoading(true);

    const result = await extractActiveTabContent();

    if (!result?.ok) {
      setPage(null);
      setBanner({
        kind: "error",
        text:
          result?.error === "unsupported-page"
            ? "Saar AI can't run on this page (browser or store pages are off-limits)."
            : `Couldn't read this page: ${result?.error || "unknown error"}`,
      });
      setLoading(false);
      return null;
    }

    setBanner(null);
    setPage(result);
    setLoading(false);
    return result;
  }, [onBeforeRefresh]);

  useEffect(() => {
    refresh();

    const onActivated = () => refresh();
    const onUpdated = (_id, info, tab) => {
      if (tab.active && info.status === "complete") refresh();
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);

    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [refresh]);

  return { page, banner, setBanner, loading, refresh };
}