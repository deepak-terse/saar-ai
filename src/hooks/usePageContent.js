import { useCallback, useEffect, useState } from "react";
import { extractActiveTabContent } from "../services/chrome";
import { classifyPageCategory } from "../services/classify";

export const usePageContent = ({ onBeforeRefresh } = {}) => {
	const [page, setPage] = useState(null);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [category, setCategory] = useState(null);
	const [classifying, setClassifying] = useState(false);

	const refresh = useCallback(async () => {
		onBeforeRefresh?.();
		setLoading(true);
		setError(null);
		setCategory(null);
		setClassifying(false);

		const result = await extractActiveTabContent();

		if (!result?.ok) {
			setPage(null);
			setError(result?.error || "unknown error");
			setLoading(false);
			return null;
		}

		setError(null);
		setPage(result);
		setLoading(false);
		return result;
	}, [onBeforeRefresh]);

	// Run classification whenever a new page is extracted.
	useEffect(() => {
		if (!page) return;

		let cancelled = false;
		setClassifying(true);
		setCategory(null);

		classifyPageCategory(page).then((result) => {
			if (!cancelled) {
				setCategory(result);
				setClassifying(false);
			}
		});

		return () => { cancelled = true; };
	}, [page]);

	useEffect(() => {
		refresh();

		const onActivated = () => refresh();
		const onUpdated = (_id, info, tab) => {
			if (tab.active && info.status === "complete") refresh();
		};

		if (typeof chrome !== "undefined" && chrome.tabs?.onActivated) {
			chrome.tabs.onActivated.addListener(onActivated);
			chrome.tabs.onUpdated.addListener(onUpdated);

			return () => {
				chrome.tabs.onActivated.removeListener(onActivated);
				chrome.tabs.onUpdated.removeListener(onUpdated);
			};
		}
	}, [refresh]);

	return { page, error, loading, refresh, category, classifying };
}