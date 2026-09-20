import { getSessionItem, setSessionItem, removeSessionItem, subscribeSessionStorage } from "./sessionStorage.js";
import { getLocalItem, setLocalItem, removeLocalItem, subscribeLocalStorage } from "./localStorage.js";
import { getIndexDBItem, setIndexDBItem, removeIndexDBItem, subscribeIndexedDB } from "./indexedDB.js";

export const STORAGE_TYPES = {
	SESSION: "session",
	LOCAL: "local",
	INDEXED_DB: "indexedDB",
};

const KNOWN_LOCAL_KEYS = new Set(["siteVisited", "secondsSaved"]);

export const resolveStorageType = (key) => {
	if (!key) return null;
	if (KNOWN_LOCAL_KEYS.has(key)) return STORAGE_TYPES.LOCAL;

	if (typeof key === "string") {
		if (
			key.startsWith("ask:") ||
			key.startsWith("read:") ||
			key.startsWith("quiz:") ||
			key.startsWith("session:") ||
			key.startsWith("cache:") ||
			key.startsWith("saar:")
		) {
			return STORAGE_TYPES.SESSION;
		}

		if (
			/^https?:\/\//i.test(key) ||
			key.startsWith("page:") ||
			key.startsWith("idb:") ||
			key.startsWith("chrome-extension://") ||
			key.startsWith("file://")
		) {
			return STORAGE_TYPES.INDEXED_DB;
		}
	}

	return STORAGE_TYPES.LOCAL;
};

const getService = (type) => {
	switch (type) {
		case STORAGE_TYPES.SESSION:
			return {
				getItem: getSessionItem,
				setItem: setSessionItem,
				removeItem: removeSessionItem,
				subscribe: subscribeSessionStorage,
			};
		case STORAGE_TYPES.INDEXED_DB:
			return {
				getItem: getIndexDBItem,
				setItem: setIndexDBItem,
				removeItem: removeIndexDBItem,
				subscribe: subscribeIndexedDB,
			};
		case STORAGE_TYPES.LOCAL:
		default:
			return {
				getItem: getLocalItem,
				setItem: setLocalItem,
				removeItem: removeLocalItem,
				subscribe: subscribeLocalStorage,
			};
	}
};

export const getStorageItem = (key) => {
	const type = resolveStorageType(key);
	return getService(type).getItem(key);
};

export const setStorageItem = (key, value) => {
	const type = resolveStorageType(key);
	return getService(type).setItem(key, value);
};

export const removeStorageItem = (key) => {
	const type = resolveStorageType(key);
	return getService(type).removeItem(key);
};

export const subscribeStorage = (key, callback) => {
	const type = resolveStorageType(key);
	return getService(type).subscribe(key, callback);
};
