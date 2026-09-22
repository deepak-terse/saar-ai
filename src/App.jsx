import { useCallback, useEffect, useState } from "react";
import { Header } from "./components/Header";
import { Banner } from "./components/Banner";
import { Tabs } from "./components/Tabs";
import { ReadView } from "./components/ReadView";
import { AskView } from "./components/AskView";
import { QuizView } from "./components/QuizView";
import { usePageContent } from "./hooks/usePageContent";
import { useAIContext } from "./hooks/useAIContext";
import { supportsOnDeviceAI, getSummarizerAvailability } from "./services/ai";
import { calculateQuizStats } from "./utils/quiz";
import "./styles.css";

const App = () => {
	const [activeTab, setActiveTab] = useState("read");
	const [status, setStatus] = useState("unavailable");
	const [banner, setBanner] = useState(null);
	const [aiReady, setAiReady] = useState(false);
	const [controlsEnabled, setControlsEnabled] = useState(false);
	const [summaryState, setSummaryState] = useState({ hasSummary: false, minutesSaved: 0 });
	const [quizStats, setQuizStats] = useState(() => calculateQuizStats([], null));
	const [aiStatus, setAiStatus] = useState("checking");
	const [aiErrorText, setAiErrorText] = useState("");

	const { contextWindow, contextUsage, remaining, usagePercent, refreshUsage } = useAIContext();

	const beforeRefresh = useCallback(() => {
		setAiReady(false);
		setControlsEnabled(false);
	}, []);

	const { page, error: pageError, category, classifying } = usePageContent({
		onBeforeRefresh: beforeRefresh,
	});

	// Check on-device AI support & availability
	useEffect(() => {
		let cancelled = false;

		const checkAvailability = async () => {
			if (!supportsOnDeviceAI()) {
				if (cancelled) return;
				setAiStatus("unavailable");
				setAiErrorText("This Chrome version doesn't support on-device AI. Update to Chrome 138+ to use Saar AI.");
				return;
			}

			try {
				const availability = await getSummarizerAvailability();
				if (cancelled) return;

				if (availability === "unavailable") {
					setAiStatus("unavailable");
					setAiErrorText("On-device AI isn't available on this device (check Chrome's hardware requirements).");
					return;
				}

				setAiStatus("ready");
				setAiErrorText("");
			} catch {
				if (!cancelled) {
					setAiStatus("unavailable");
					setAiErrorText("On-device AI isn't available on this device (check Chrome's hardware requirements).");
				}
			}
		};

		checkAvailability();
		return () => {
			cancelled = true;
		};
	}, []);

	// Centrally manage status and banner in App
	useEffect(() => {
		if (aiStatus === "checking") return;

		if (aiStatus === "unavailable") {
			setStatus("ai unavailable");
			setAiReady(false);
			setBanner({
				kind: "error",
				text: aiErrorText || "On-device AI isn't available on this device.",
			});
			return;
		}

		if (pageError) {
			setStatus("unsupported");
			setAiReady(false);
			setBanner({
				kind: "error",
				text:
					pageError === "unsupported"
						? "Saar AI can't run on this page (browser or store pages are off-limits)."
						: `Couldn't read this page: ${pageError}`,
			});
			return;
		}

		if (page) {
			setStatus((current) => (current === "busy" ? "busy" : "ready"));
			setAiReady(true);
			setBanner((current) => (current?.kind === "error" ? null : current));
		}
	}, [aiStatus, aiErrorText, page, pageError]);

	// Show a classifying banner while category detection is in progress.
	useEffect(() => {
		if (classifying && page) {
			setBanner({ kind: "info", text: "Classifying content…" });
		} else if (!classifying && page && category) {
			setBanner((current) =>
				current?.text === "Classifying content…" ? null : current
			);
		}
	}, [classifying, page, category]);

	// Controls are enabled only when page is loaded, AI is ready, AND classification is complete.
	useEffect(() => {
		setControlsEnabled(Boolean(page && aiReady && category && !classifying));
	}, [page, aiReady, category, classifying]);

	const readTabActive = activeTab === "read";
	const askTabActive = activeTab === "ask";
	const quizTabActive = activeTab === "quiz";

	return (
		<>
			<Header
				status={status}
				contextWindow={contextWindow}
				page={page}
				activeTab={activeTab}
				hasSummary={summaryState.hasSummary}
				minutesSaved={summaryState.minutesSaved}
				contextUsage={contextUsage}
				remaining={remaining}
				usagePercent={usagePercent}
				quizStats={quizStats}
			/>
			<Banner banner={banner} />
			<Tabs activeTab={activeTab} onChange={setActiveTab} />
			<main className="views">
				<ReadView
					active={readTabActive}
					page={page}
					aiReady={aiReady}
					status={status}
					setStatus={setStatus}
					setBanner={setBanner}
					controlsEnabled={controlsEnabled}
					setControlsEnabled={setControlsEnabled}
					category={category}
					contextUsage={contextUsage}
					remaining={remaining}
					usagePercent={usagePercent}
					refreshUsage={refreshUsage}
					onSummaryStateChange={setSummaryState}
				/>
				<AskView active={askTabActive} page={page} setBanner={setBanner} category={category} contextUsage={contextUsage} remaining={remaining} usagePercent={usagePercent} refreshUsage={refreshUsage} />
				<QuizView
					active={quizTabActive}
					page={page}
					setBanner={setBanner}
					category={category}
					contextUsage={contextUsage}
					remaining={remaining}
					usagePercent={usagePercent}
					refreshUsage={refreshUsage}
					onQuizStatsChange={setQuizStats}
				/>
			</main>
		</>
	);
}

export default App;