import { useCallback, useEffect, useRef, useState } from "react";
import { getStorageItem, setStorageItem, subscribeStorage } from "../services/storage";

export const useStorage = (key, initialValue) => {
	const [value, setValue] = useState(initialValue);
	const [loading, setLoading] = useState(Boolean(key));
	const valueRef = useRef(value);
	valueRef.current = value;

	useEffect(() => {
		if (!key) {
			setValue(initialValue);
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);

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
