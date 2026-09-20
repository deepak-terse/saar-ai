import { CONTENT_CATEGORIES, CATEGORY_CLASSIFICATION_PROMPT } from "../constants/modes";
import { createLanguageModel, getLanguageModelAvailability } from "./ai";
import { normalizeUrl } from "../utils/url";
import { getSessionItem, setSessionItem } from "./sessionStorage";

const DEFAULT_CATEGORY = 1;
const cacheKey = (url) => `saar:category:${normalizeUrl(url)}`;

export const classifyPageCategory = async (page) => {
	if (!page?.text) return DEFAULT_CATEGORY;

	const key = cacheKey(page.url);
	const cachedCategory = Number(await getSessionItem(key));

	if (cachedCategory) return cachedCategory;

	try {
		if ((await getLanguageModelAvailability()) === "unavailable") return DEFAULT_CATEGORY;

		const session = await createLanguageModel();

		try {
			const response = await session.prompt(CATEGORY_CLASSIFICATION_PROMPT(page.title, page.url, page.text));

			const category = Number(String(response).match(/\d+/)?.[0]) || DEFAULT_CATEGORY;
			await setSessionItem(key, category);

			return category;
		} finally {
			session?.destroy?.();
		}
	} catch (error) {
		console.warn("Saar AI category classification failed:", error);
		return DEFAULT_CATEGORY;
	}
};