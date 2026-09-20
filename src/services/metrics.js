import { normalizeUrl } from "../utils/url";
import { getPage, savePage } from "./indexedDB";
import { getLocalItem, setLocalItem } from "./localStorage";

const WORDS_PER_MINUTE = 200;

export const wordsToSeconds = (wordCount) => {
	const words = Math.max(0, Number(wordCount) || 0);
	return Math.max(1, Math.round((words / WORDS_PER_MINUTE) * 60));
};

export const getCommonMetrics = async () => {
	try {
		const siteVisited = Number(await getLocalItem("siteVisited")) || 0;
		const secondsSaved = Number(await getLocalItem("secondsSaved")) || 0;
		return {
			siteVisited,
			secondsSaved,
			hoursSaved: Math.round((secondsSaved / 3600) * 10) / 10,
			articlesCondensed: siteVisited,
		};
	} catch (err) {
		console.warn("Failed to get common metrics:", err);
	}
	return { siteVisited: 0, secondsSaved: 0, hoursSaved: 0, articlesCondensed: 0 };
};

export const saveCommonMetrics = async ({ siteVisited, secondsSaved }) => {
	try {
		if (siteVisited !== undefined) await setLocalItem("siteVisited", Number(siteVisited) || 0);
		if (secondsSaved !== undefined) await setLocalItem("secondsSaved", Number(secondsSaved) || 0);
	} catch (err) {
		console.warn("Failed to save common metrics:", err);
	}
};

export const getLifetimeMetrics = getCommonMetrics;

export const ensurePageVisit = async (rawUrl, { words = 0, category = 1 } = {}) => {
	const url = normalizeUrl(rawUrl);
	if (!url) return null;

	let record = await getPage(url);
	if (!record) {
		const pageSeconds = wordsToSeconds(words);
		record = {
			url,
			visited: true,
			pageMetadata: {
				words: Number(words) || 0,
				seconds: pageSeconds,
				category: Number(category) || 1,
			},
			readingMetadata: {
				secondsRead: 0,
			},
		};
		await savePage(record);

		const current = await getCommonMetrics();
		await saveCommonMetrics({ siteVisited: current.siteVisited + 1 });
	} else if (category && (!record.pageMetadata?.category || record.pageMetadata.category !== category)) {
		record.pageMetadata = {
			...record.pageMetadata,
			words: Number(words) || record.pageMetadata?.words || 0,
			seconds: record.pageMetadata?.seconds || wordsToSeconds(words),
			category: Number(category),
		};
		await savePage(record);
	}

	return record;
};

export const recordReadingSeconds = async (rawUrl, additionalSecondsRead) => {
	const url = normalizeUrl(rawUrl);
	if (!url || !additionalSecondsRead) return null;

	const record = await getPage(url);
	if (!record) return null;

	const prevRead = record.readingMetadata?.secondsRead || 0;
	const newRead = prevRead + Math.max(1, Math.round(additionalSecondsRead));

	record.readingMetadata = {
		...record.readingMetadata,
		secondsRead: newRead,
	};
	await savePage(record);

	const current = await getCommonMetrics();
	const savedDelta = Math.max(1, Math.round(additionalSecondsRead));
	await saveCommonMetrics({ secondsSaved: current.secondsSaved + savedDelta });

	return record;
};

export const calculateSavings = (pageWords, secondsRead = 0) => {
	const pageTotalSec = wordsToSeconds(pageWords);
	const rawSaved = Math.max(0, pageTotalSec - secondsRead);
	const minutesSaved = Math.max(1, Math.round(rawSaved / 60));
	return { pageTotalSec, secondsRead, minutesSaved };
};
