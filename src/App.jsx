import { useCallback, useEffect, useState } from "react";
import { Header } from "./components/Header";
import { Banner } from "./components/Banner";
import { Tabs } from "./components/Tabs";
import { ReadView } from "./components/ReadView";
import { AskView } from "./components/AskView";
import { QuizView } from "./components/QuizView";
import { usePageContent } from "./hooks/usePageContent";
import { supportsOnDeviceAI, getSummarizerAvailability } from "./services/ai";
import "./styles.css";

export default App = () => {
	const [activeTab, setActiveTab] = useState("read");
	const [status, setStatus] = useState("error");
	const [banner, setBanner] = useState(null);
	const [aiReady, setAiReady] = useState(false);
	const [controlsEnabled, setControlsEnabled] = useState(false);

	const beforeRefresh = useCallback(() => {
		setAiReady(false);
		setControlsEnabled(false);
	}, []);

	const { page, banner: pageBanner } = usePageContent({
		onBeforeRefresh: beforeRefresh,
	});

	useEffect(() => {
		if (pageBanner) setBanner(pageBanner);
		else if (page) setBanner(null);
	}, [pageBanner, page]);

	useEffect(() => {
		let cancelled = false;

		const checkAvailability = async () => {
			if (!supportsOnDeviceAI()) {
				setStatus("error");
				setAiReady(false);
				setBanner({
					kind: "error",
					text: "This Chrome version doesn't support on-device AI. Update to Chrome 138+ to use Saar AI.",
				});
				return;
			}

			try {
				const availability = await getSummarizerAvailability();
				if (cancelled) return;

				if (availability === "unavailable") {
					setStatus("error");
					setAiReady(false);
					setBanner({
						kind: "error",
						text: "On-device AI isn't available on this device (check Chrome's hardware requirements).",
					});
					return;
				}

				setStatus("ready");
				setAiReady(true);
			} catch {
				if (!cancelled) {
					setStatus("error");
					setAiReady(false);
				}
			}
		}

		if (page) checkAvailability();
		return () => { cancelled = true; };
	}, [page]);

	const readTabActive = activeTab === "read";
	const askTabActive = activeTab === "ask";
	const quizTabActive = activeTab === "quiz";

	return (
		<>
			<Header status={status} />
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
				/>
				<AskView active={askTabActive} page={page} setBanner={setBanner} />
				<QuizView active={quizTabActive} page={page} setBanner={setBanner} />
			</main>
		</>
	);
}