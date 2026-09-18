import { CONTENT_CATEGORIES, CATEGORY_CLASSIFICATION_PROMPT } from "../constants/modes";
import { createLanguageModel, getLanguageModelAvailability } from "./ai";
import { getSessionValue, setSessionValue } from "./chrome";

const cacheKey = (url) => `saar:category:${url}`;

const parseCategory = (raw) => {
  const match = String(raw).match(/[123]/);
  return match ? Number(match[0]) : null;
};

/**
 * Classify a page's content into one of three categories.
 * Returns the category number (1, 2, or 3).
 * Uses session storage to cache results per URL.
 * Falls back to category 1 (article) on failure.
 */
export const classifyPageCategory = async (page) => {
  if (!page?.text) return 1;

  const cached = await getSessionValue(cacheKey(page.url));
  if (cached && CONTENT_CATEGORIES[cached]) return cached;

  try {
    const availability = await getLanguageModelAvailability();
    if (availability === "unavailable") return 1;

    const session = await createLanguageModel();

    try {
      const prompt = CATEGORY_CLASSIFICATION_PROMPT(page.title, page.url, page.text);
      const response = await session.prompt(prompt);
      const category = parseCategory(response) || 1;

      await setSessionValue(cacheKey(page.url), category);
      return category;
    } finally {
      session?.destroy?.();
    }
  } catch (err) {
    console.warn("Saar AI category classification failed:", err);
    return 1;
  }
};
