import { useCallback, useEffect, useMemo, useState } from "react";
import { createLanguageModel } from "../services/ai";

export const useAIContext = () => {
	const [contextWindow, setContextWindow] = useState(null);
	const [contextUsage, setContextUsage] = useState(0);

	// On mount, create a disposable probe session to read the context window size.
	useEffect(() => {
		let cancelled = false;

		const probe = async () => {
			try {
				const session = await createLanguageModel();
				if (cancelled) {
					session?.destroy?.();
					return;
				}

				setContextWindow(session.contextWindow ?? null);
				setContextUsage(session.contextUsage ?? 0);
				session.destroy();
			} catch {
				// AI unavailable — leave values as null / 0.
			}
		};

		if ("LanguageModel" in self) probe();

		return () => { cancelled = true; };
	}, []);

	const refreshUsage = useCallback((session) => {
		if (!session) return;

		if (session.contextWindow != null) {
			setContextWindow(session.contextWindow);
		}
		if (session.contextUsage != null) {
			setContextUsage(session.contextUsage);
		}
	}, []);

	const remaining = useMemo(
		() => (contextWindow != null ? Math.max(0, contextWindow - contextUsage) : null),
		[contextWindow, contextUsage],
	);

	const usagePercent = useMemo(
		() => (contextWindow ? Math.min(100, Math.round((contextUsage / contextWindow) * 100)) : 0),
		[contextWindow, contextUsage],
	);

	return { contextWindow, contextUsage, remaining, usagePercent, refreshUsage };
};
