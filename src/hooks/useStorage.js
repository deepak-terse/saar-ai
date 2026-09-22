import { useCallback, useEffect, useRef, useState } from "react";
import { getStorageItem, getStorageItemSync, setStorageItem, subscribeStorage } from "../services/storage";

export const useStorage = (key, initialValue) => {
	const [value, setValue] = useState(() => {
		if (!key) return initialValue;
		const syncVal = getStorageItemSync(key);
		return syncVal !== undefined && syncVal !== null ? syncVal : initialValue;
	});
	const [loading, setLoading] = useState(() => Boolean(key && getStorageItemSync(key) === undefined));
	const valueRef = useRef(value);
	valueRef.current = value;

	useEffect(() => {
		if (!key) {
			setValue(initialValue);
			setLoading(false);
			return;
		}

		let cancelled = false;
		const syncVal = getStorageItemSync(key);
		if (syncVal !== undefined && syncVal !== null) {
			setValue(syncVal);
			setLoading(false);
		} else {
			setValue(initialValue);
			setLoading(true);
		}

		getStorageItem(key).then((stored) => {
			if (!cancelled) {
				setValue(stored !== undefined && stored !== null ? stored : initialValue);
				setLoading(false);
			}
		});

		const unsubscribe = subscribeStorage(key, (newValue) => {
			if (!cancelled) setValue(newValue !== undefined && newValue !== null ? newValue : initialValue);
		});

		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, [key]);

	const updateValue = useCallback(
		(updater) => {
			if (!key) return;
			const nextValue = typeof updater === "function" ? updater(valueRef.current) : updater;
			valueRef.current = nextValue;
			setValue(nextValue);
			void setStorageItem(key, nextValue);
		},
		[key]
	);

	return [value, updateValue, loading];
};
