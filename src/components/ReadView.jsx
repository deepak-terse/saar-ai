import { useEffect, useRef, useState } from "react";
import { MODES, CONTENT_CATEGORIES } from "../constants/modes";
import { createSummarizer, getSummarizerAvailability, getLanguageModelAvailability, createLanguageModel, } from "../services/ai";
import { COMMON_SYSTEM_INSTRUCTIONS, buildPromptContext } from "../constants/systemPrompt";
import { useStorage } from "../hooks/useStorage";
import { normalizeUrl } from "../utils/url";
import { ensurePageVisit, recordReadingSeconds, calculateSavings } from "../services/metrics";
import { friendlyError } from "../utils/rendering";
import { MarkdownOutput } from "./MarkdownOutput";
import { LifetimeEfficiencyDashboard } from "./LifetimeEfficiencyDashboard";

const Output = ({ label, text }) => (
	<div className="output" aria-live="polite">
		{label && <h2 className="mode-label">{label}</h2>}
		<MarkdownOutput text={text} />
	</div>
);

const Skeleton = () => (
	<div aria-hidden="true">
		<div className="skeleton-line" />
		<div className="skeleton-line" />
		<div className="skeleton-line" />
	</div>
);

export const ReadView = ({
	active,
	page,
	status,
	setStatus,
	setBanner,
	controlsEnabled,
	category,
	contextUsage,
	remaining,
	usagePercent,
	refreshUsage,
	onSummaryStateChange,
}) => {
	const normalizedUrl = page?.url ? normalizeUrl(page.url) : null;
	const sessionKey = normalizedUrl ? `read:${normalizedUrl}` : null;

	// Storage hooks
	const [sessionRead, setSessionRead] = useStorage(sessionKey, { summaries: {}, activeMode: null });
	const [pageRecord] = useStorage(normalizedUrl, null);
	const [siteVisited] = useStorage("siteVisited", 0);
	const [secondsSaved] = useStorage("secondsSaved", 0);

	// Derived and transient state
	const activeMode = sessionRead?.activeMode || (Object.keys(sessionRead?.summaries || {})[0] ?? null);
	const [streaming, setStreaming] = useState(false);
	const [streamingText, setStreamingText] = useState("");
	const [error, setError] = useState("");

	const activeEngineRef = useRef(null);
	const activeUrlRef = useRef(normalizedUrl);
	activeUrlRef.current = normalizedUrl;

	const modeStartTimeRef = useRef(Date.now());
	const activeModeRef = useRef(activeMode);
	activeModeRef.current = activeMode;

	const mode = activeMode ? MODES[activeMode] : null;
	const currentSummary = activeMode ? sessionRead?.summaries?.[activeMode] : null;
	const displayOutput = streaming ? streamingText : currentSummary;

	const lifetimeMetrics = {
		siteVisited,
		secondsSaved,
		hoursSaved: Math.round((secondsSaved / 3600) * 10) / 10,
		articlesCondensed: siteVisited,
	};

	// Ensure page visit is recorded in IndexedDB and siteVisited incremented if new
	useEffect(() => {
		if (!page?.url) return;
		const rawWords = page.wordCount;
		const words =
			typeof rawWords === "number"
				? rawWords
				: Array.isArray(rawWords)
					? rawWords.length
					: page.text
						? page.text.trim().split(/\s+/).filter(Boolean).length
						: 0;
		ensurePageVisit(page.url, { words, category: category || 1 });
	}, [page?.url, page?.wordCount, category]);

	// Reset transient streaming and error state when page changes
	useEffect(() => {
		activeEngineRef.current?.destroy?.();
		activeEngineRef.current = null;
		setStreaming(false);
		setStreamingText("");
		setError("");
	}, [normalizedUrl]);

	// Cleanup active engine on unmount
	useEffect(() => {
		return () => {
			activeEngineRef.current?.destroy?.();
			activeEngineRef.current = null;
		};
	}, []);

	// Commit reading time when leaving or changing mode
	const commitReadingTime = async () => {
		if (!normalizedUrl || !activeModeRef.current) return;
		const spentSec = Math.round((Date.now() - modeStartTimeRef.current) / 1000);
		if (spentSec >= 2) {
			await recordReadingSeconds(normalizedUrl, spentSec);
		}
	};

	// Reading time tracking & subheader savings updater
	useEffect(() => {
		if (!page || !activeMode || (!currentSummary && !streaming)) {
			onSummaryStateChange?.({ hasSummary: false, minutesSaved: 0 });
			return;
		}

		modeStartTimeRef.current = Date.now();
		const rawWords = page.wordCount;
		const pageWords =
			typeof rawWords === "number"
				? rawWords
				: Array.isArray(rawWords)
					? rawWords.length
					: page.text
						? page.text.trim().split(/\s+/).filter(Boolean).length
						: 0;

		const updateSavings = () => {
			const spentSoFar = Math.round((Date.now() - modeStartTimeRef.current) / 1000);
			const totalRead = (pageRecord?.readingMetadata?.secondsRead || 0) + spentSoFar;
			const { minutesSaved } = calculateSavings(pageWords, totalRead);
			onSummaryStateChange?.({ hasSummary: true, minutesSaved });
		};

		updateSavings();
		const timer = setInterval(updateSavings, 1000);

		return () => {
			clearInterval(timer);
			commitReadingTime();
		};
	}, [page, activeMode, currentSummary, streaming, pageRecord?.readingMetadata?.secondsRead, onSummaryStateChange]);

	// Handle window unload
	useEffect(() => {
		const onUnload = () => commitReadingTime();
		window.addEventListener("beforeunload", onUnload);
		return () => window.removeEventListener("beforeunload", onUnload);
	}, []);

	const generate = async (modeKey) => {
		if (!page || streaming || !controlsEnabled) return;

		const selectedMode = MODES[modeKey];
		const targetUrl = normalizedUrl;
		setStreaming(true);
		setStreamingText("");
		setStatus("busy");
		setError("");

		try {
			let full = "";

			if (selectedMode.engine === "summarizer") {
				const availability = await getSummarizerAvailability();
				if (availability === "unavailable") {
					throw new Error("On-device AI isn't available for this mode on this device.");
				}

				const summarizer = await createSummarizer(selectedMode, setBanner);
				activeEngineRef.current = summarizer;
				setBanner(null);

				const stream = summarizer.summarizeStreaming(page.text, {
					context: `
          Page title: ${page.title}
          ${category && CONTENT_CATEGORIES[category] ? `Content type: ${CONTENT_CATEGORIES[category].types}\n` : ""}
          Instructions: ${selectedMode.instruction}`,
				});

				for await (const chunk of stream) {
					if (activeUrlRef.current !== targetUrl) break;
					full += chunk;
					setStreamingText(full);
				}

				summarizer?.destroy?.();
				if (activeEngineRef.current === summarizer) {
					activeEngineRef.current = null;
				}
			} else {
				const availability = await getLanguageModelAvailability();
				if (availability === "unavailable") {
					throw new Error("On-device AI isn't available for this mode on this device.");
				}

				let session;
				try {
					session = await createLanguageModel({
						systemPrompt: COMMON_SYSTEM_INSTRUCTIONS,
						monitor: (monitor) => {
							monitor.addEventListener("downloadprogress", (event) => {
								setBanner(
									`Downloading the on-device model — one-time setup (${Math.round(
										event.loaded * 100
									)}%).`
								);
							});
						},
					});
					activeEngineRef.current = session;

					setBanner(null);

					const instruction = Array.isArray(selectedMode.instruction)
						? selectedMode.instruction[category - 1] || selectedMode.instruction[0]
						: selectedMode.instruction;

					const contextBlock = buildPromptContext({ page, category });
					const prompt = `${instruction}\n\n${contextBlock}`;

					const stream = session.promptStreaming(prompt);
					for await (const chunk of stream) {
						if (activeUrlRef.current !== targetUrl) break;
						full += chunk;
						setStreamingText(full);
					}
				} finally {
					refreshUsage?.(session);
					session?.destroy?.();
					if (activeEngineRef.current === session) {
						activeEngineRef.current = null;
					}
				}
			}

			if (activeUrlRef.current === targetUrl && full) {
				setSessionRead((prev) => ({
					...prev,
					activeMode: modeKey,
					summaries: {
						...(prev?.summaries || {}),
						[modeKey]: full,
					},
				}));
			}
		} catch (err) {
			if (activeUrlRef.current === targetUrl) {
				setError(
					err?.message?.startsWith("On-device AI isn't available")
						? err.message
						: `Couldn't generate this. ${friendlyError(err)}`
				);
			}
		} finally {
			if (activeUrlRef.current === targetUrl) {
				setStreaming(false);
				setStatus("ready");
			}
		}
	};

	const handleModeClick = async (key) => {
		if (!page || streaming || !controlsEnabled) return;
		await commitReadingTime();
		setSessionRead((prev) => ({
			...prev,
			activeMode: key,
		}));
		setError("");

		const cached = sessionRead?.summaries?.[key];
		if (!cached) {
			generate(key);
		}
	};

	const isSummaryActive = Boolean(activeMode && (displayOutput || streaming || error));

	return (
		<section
			id="panel-read"
			className={`view${active ? " is-active" : ""}${!isSummaryActive ? " view-initial" : ""}`}
			role="tabpanel"
			aria-labelledby="tab-read"
			hidden={!active}
		>
			<div className="mode-grid" role="group" aria-label="Summary mode">
				{Object.entries(MODES).map(([key, item]) => {
					const isVisited = Boolean(sessionRead?.summaries?.[key]);
					return (
						<button
							key={key}
							type="button"
							className={`mode-btn${key === activeMode ? " is-active" : ""}${isVisited ? " is-visited" : ""}`}
							disabled={!controlsEnabled || streaming}
							aria-pressed={key === activeMode}
							aria-label={`${item.label}: ${item.description}`}
							title={item.description}
							onClick={() => handleModeClick(key)}
						>
							{item.label}
						</button>
					);
				})}
			</div>

			{!isSummaryActive ? (
				<div className="read-empty-container">
					<LifetimeEfficiencyDashboard metrics={lifetimeMetrics} />
				</div>
			) : streaming ? (
				<div className="output" aria-live="polite">
					<h2 className="mode-label">{mode?.label}</h2>
					{streamingText ? <MarkdownOutput text={streamingText} /> : <Skeleton />}
				</div>
			) : error ? (
				<div className="output">
					<p className="error-state">{error}</p>
				</div>
			) : displayOutput ? (
				<Output label={mode?.label} text={displayOutput} />
			) : (
				<div className="output" aria-live="polite">
					<p className="empty-state">Click "{mode?.label || "a mode"}" to generate it for this page.</p>
				</div>
			)}
		</section>
	);
}