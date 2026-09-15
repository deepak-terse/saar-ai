import { useEffect, useMemo, useState } from "react";
import { MODES } from "../constants/modes";
import {
	createSummarizer,
	getSummarizerAvailability,
	getLanguageModelAvailability,
	createLanguageModel,
} from "../services/ai";
import { getSessionValue, setSessionValue } from "../services/chrome";
import { friendlyError, getPercentItems, parsePromptLines, renderLabeledText } from "../utils/rendering";

const keyFor = (page, mode) => `readassist:${page.url}:${mode}`;

const Output = ({ text, mode }) => {
	const lines = useMemo(() => parsePromptLines(text), [text]);
	const percentItems = useMemo(
		() => (mode.chart ? getPercentItems(lines) : []),
		[mode.chart, lines]
	);

	return (
		<div className="output" aria-live="polite">
			{mode.chart && percentItems.length >= 2 && (
				<div className="chart">
					{percentItems.map(({ label, value }) => (
						<div className="chart-row" key={`${label}-${value}`}>
							<span className="chart-label">{label}</span>
							<span className="chart-track">
								<span className="chart-fill" style={{ width: `${value}%` }} />
							</span>
							<span className="chart-value">{value}%</span>
						</div>
					))}
				</div>
			)}

			{lines.map((line, index) => {
				const isBullet = /^[-*]\s+/.test(line);
				const content = renderLabeledText(
					isBullet ? line.replace(/^[-*]\s+/, "") : line
				);

				return isBullet ? (
					<ul key={index}>
						<li>
							{content.label ? <strong>{content.label}</strong> : null}
							{content.label ? ` ${content.value}` : content.value}
						</li>
					</ul>
				) : (
					<p key={index}>
						{content.label ? <strong>{content.label}</strong> : null}
						{content.label ? ` ${content.value}` : content.value}
					</p>
				);
			})}
		</div>
	);
}

const Skeleton = () => (
	<div aria-hidden="true">
		<div className="skeleton-line" />
		<div className="skeleton-line" />
		<div className="skeleton-line" />
	</div>
);

export const ReadView = ({ active, page, aiReady, status, setStatus, setBanner, controlsEnabled, setControlsEnabled, }) => {
	const [activeMode, setActiveMode] = useState("highlights");
	const [outputs, setOutputs] = useState({});
	const [streaming, setStreaming] = useState(false);
	const [regenerate, setRegenerate] = useState(false);
	const [output, setOutput] = useState("");
	const [outputMode, setOutputMode] = useState(null);
	const [error, setError] = useState("");

	const mode = MODES[activeMode];

	useEffect(() => {
		let cancelled = false;

		const loadCache = async () => {
			if (!page) return;
			const value = await getSessionValue(keyFor(page, activeMode));
			if (cancelled) return;

			setOutputs((current) => ({ ...current, [activeMode]: value }));
			if (value) {
				setOutput(value);
				setOutputMode(mode);
				setRegenerate(true);
			} else {
				setOutput("");
				setOutputMode(null);
				setRegenerate(false);
			}
		}

		loadCache();
		return () => { cancelled = true; };
	}, [page, activeMode, mode]);

	useEffect(() => {
		setControlsEnabled(Boolean(page && aiReady));
	}, [page, aiReady, setControlsEnabled]);

	const showMeta = page
		? `${page.wordCount.toLocaleString()} words · about ${Math.max(
			1,
			Math.round(page.wordCount / 200)
		)} min read${page.truncated ? " · summarized from the first part of this page" : ""}`
		: "";

	const generate = async (modeKey) => {
		if (!page || streaming || !controlsEnabled) return;

		const selectedMode = MODES[modeKey];
		setStreaming(true);
		setStatus("busy");
		setError("");
		setOutput("");
		setOutputMode(null);
		setRegenerate(true);

		try {
			let full = "";

			if (selectedMode.engine === "summarizer") {
				const availability = await getSummarizerAvailability();
				if (availability === "unavailable") {
					throw new Error("On-device AI isn't available for this mode on this device.");
				}

				const summarizer = await createSummarizer(selectedMode, setBanner);
				setBanner(null);

				const stream = summarizer.summarizeStreaming(page.text, {
					context: `Page title: ${page.title}`,
				});

				for await (const chunk of stream) {
					full += chunk;
					setOutput((current) => current + chunk);
				}

				setOutputs((current) => ({ ...current, [modeKey]: full }));
				await setSessionValue(keyFor(page, modeKey), full);
				setOutputMode(selectedMode);
				summarizer?.destroy?.();
			} else {
				const availability = await getLanguageModelAvailability();
				if (availability === "unavailable") {
					throw new Error("On-device AI isn't available for this mode on this device.");
				}

				let session;
				try {
					session = await createLanguageModel({
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

					setBanner(null);

					const prompt =
						`${selectedMode.instruction}\n\nPage title: ${page.title}\nPage URL: ${page.url}\n\nPage content:\n"""\n${page.text}\n"""`;

					const stream = session.promptStreaming(prompt);
					for await (const chunk of stream) {
						full += chunk;
						setOutput((current) => current + chunk);
					}

					setOutput(full);
					setOutputMode(selectedMode);
					setOutputs((current) => ({ ...current, [modeKey]: full }));
					await setSessionValue(keyFor(page, modeKey), full);
				} finally {
					session?.destroy?.();
				}
			}
		} catch (err) {
			setError(
				err?.message?.startsWith("On-device AI isn't available")
					? err.message
					: `Couldn't generate this. ${friendlyError(err)}`
			);
		} finally {
			setStreaming(false);
			setStatus("ready");
		}
	}

	const handleModeClick = async (key) => {
		if (!page || streaming || !controlsEnabled) return;
		const cached = await getSessionValue(keyFor(page, key));
		setActiveMode(key);

		if (!cached) await generate(key);
	}

	const handleRegenerate = async () => generate(activeMode);

	return (
		<section
			id="panel-read"
			className={`view${active ? " is-active" : ""}`}
			role="tabpanel"
			aria-labelledby="tab-read"
			hidden={!active}
		>
			<div className="mode-grid" role="group" aria-label="Summary mode">
				{Object.entries(MODES).map(([key, item]) => (
					<button
						key={key}
						type="button"
						className={`mode-btn${key === activeMode ? " is-active" : ""}`}
						disabled={!controlsEnabled || streaming}
						aria-pressed={key === activeMode}
						aria-label={`${item.label}: ${item.description}`}
						title={item.description}
						onClick={() => handleModeClick(key)}
					>
						{item.label}
					</button>
				))}
			</div>

			<div className="output-toolbar">
				<p className="meta" hidden={!page || !regenerate}>{page ? showMeta : ""}</p>
				<button
					type="button"
					className="link-btn"
					hidden={!regenerate}
					disabled={streaming}
					onClick={handleRegenerate}
				>
					Regenerate
				</button>
			</div>

			{streaming ? (
				<div className="output" aria-live="polite">
					{output ? (
						<>{output}</>
					) : (
						<Skeleton />
					)}
				</div>
			) : error ? (
				<div className="output">
					<p className="error-state">{error}</p>
				</div>
			) : output && outputMode ? (
				<Output text={output} mode={outputMode} />
			) : (
				<div className="output" aria-live="polite">
					<p className="empty-state">
						{page
							? `Click "${mode.label}" to generate it for this page.`
							: "Open a page to summarize it."}
					</p>
				</div>
			)}
		</section>
	);
}