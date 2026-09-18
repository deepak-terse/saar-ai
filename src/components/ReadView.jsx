import { useEffect, useState } from "react";
import { MODES, CONTENT_CATEGORIES } from "../constants/modes";
import {
    createSummarizer,
    getSummarizerAvailability,
    getLanguageModelAvailability,
    createLanguageModel,
} from "../services/ai";
import { COMMON_SYSTEM_INSTRUCTIONS, buildPromptContext } from "../constants/systemPrompt";
import { getSessionValue, setSessionValue } from "../services/chrome";
import { friendlyError } from "../utils/rendering";
import { MarkdownOutput } from "./MarkdownOutput";

const keyFor = (page, mode) => `readassist:${page.url}:${mode}`;

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

export const ReadView = ({ active, page, aiReady, status, setStatus, setBanner, controlsEnabled, setControlsEnabled, category }) => {
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
                    context: `
                    Page title: ${page.title}
                    ${category && CONTENT_CATEGORIES[category] ? `Content type: ${CONTENT_CATEGORIES[category].types}\n` : ""}
                    Instructions: ${selectedMode.instruction}`,
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

                    setBanner(null);

                    const instruction = Array.isArray(selectedMode.instruction)
                        ? selectedMode.instruction[category - 1] || selectedMode.instruction[0]
                        : selectedMode.instruction;

                    const contextBlock = buildPromptContext({ page, category });
                    const prompt = `${instruction}\n\n${contextBlock}`;

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
                    <h2 className="mode-label">{mode.label}</h2>
                    {output ? (
                        <MarkdownOutput text={output} />
                    ) : (
                        <Skeleton />
                    )}
                </div>
            ) : error ? (
                <div className="output">
                    <p className="error-state">{error}</p>
                </div>
            ) : output && outputMode ? (
                <Output label={mode.label} text={output} />
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