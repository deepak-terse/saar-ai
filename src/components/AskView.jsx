import { useEffect, useRef, useState } from "react";
import { createLanguageModel, getLanguageModelAvailability } from "../services/ai";
import { CONTENT_CATEGORIES } from "../constants/modes";
import { COMMON_SYSTEM_INSTRUCTIONS } from "../constants/systemPrompt";
import { useStorage } from "../hooks/useStorage";
import { normalizeUrl } from "../utils/url";
import { friendlyError } from "../utils/rendering";
import { MarkdownOutput } from "./MarkdownOutput";

const Skeleton = () => (
	<div aria-hidden="true">
		<div className="skeleton-line" />
		<div className="skeleton-line" />
		<div className="skeleton-line" />
	</div>
);

export const AskView = ({ active, page, setBanner, category, contextUsage, remaining, usagePercent, refreshUsage }) => {
	const normalizedUrl = page?.url ? normalizeUrl(page.url) : null;
	const sessionKey = normalizedUrl ? `ask:${normalizedUrl}` : null;

	const [sessionAsk, setSessionAsk] = useStorage(sessionKey, { messages: [] });
	const [input, setInput] = useState("");
	const [streaming, setStreaming] = useState(false);

	const sessionRef = useRef(null);
	const logRef = useRef(null);
	const messages = sessionAsk?.messages || [];

	// Reset language model session when page changes
	useEffect(() => {
		sessionRef.current?.destroy?.();
		sessionRef.current = null;
		return () => {
			sessionRef.current?.destroy?.();
			sessionRef.current = null;
		};
	}, [normalizedUrl]);

	// Scroll to bottom when messages update
	useEffect(() => {
		const log = logRef.current;
		if (log) log.scrollTop = log.scrollHeight;
	}, [messages, streaming]);

	const ensureSession = async () => {
		if (sessionRef.current || !page) return sessionRef.current;

		const availability = await getLanguageModelAvailability();
		if (availability === "unavailable") return null;

		const systemPrompt = `${COMMON_SYSTEM_INSTRUCTIONS}

Answer the user's questions using ONLY the page content provided in the conversation. Always format your responses in well-structured Markdown:
- Use **bold** for key terms, bullet lists for multiple points, numbered lists for steps.
- Use headings (##, ###) when the answer has distinct sections.
- Use code blocks for code or technical notation. Use LaTeX math ($..$ inline, $$...$$ block) for formulas.
- NEVER output everything on a single line. Each list item, paragraph, and heading MUST be on its own line.
- Keep answers concise for simple questions. For explanations, descriptions, or comparisons, be thorough.
If the answer is not in the page content, say so clearly.`;

		const pageContext = `Here is the page content to answer questions about:
${category && CONTENT_CATEGORIES[category] ? `\nContent type: ${CONTENT_CATEGORIES[category].types}\n` : ""}
Title: ${page.title}
URL: ${page.url}

"""
${page.text.slice(0, 12000)}
"""

Use this content to answer my questions.`;

		const monitor = (monitor) => {
			monitor.addEventListener("downloadprogress", (event) => {
				setBanner(
					`Downloading the on-device model — one-time setup (${Math.round(event.loaded * 100)}%).`
				);
			});
		};

		try {
			let session;
			try {
				session = await createLanguageModel({
					systemPrompt,
					initialPrompts: [
						{ role: "user", content: pageContext },
						{ role: "assistant", content: "I've read the page content. Ask me anything about it and I'll answer using only what's on the page." },
					],
					monitor,
				});
			} catch {
				session = await createLanguageModel({
					initialPrompts: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: pageContext },
						{ role: "assistant", content: "I've read the page content. Ask me anything about it and I'll answer using only what's on the page." },
					],
					monitor,
				});
			}

			session.addEventListener("contextoverflow", () => {
				setSessionAsk((prev) => ({
					...prev,
					messages: [
						...(prev?.messages || []),
						{
							role: "assistant",
							content: "This conversation is getting long — earlier messages may be dropped from context.",
						},
					],
				}));
			});

			sessionRef.current = session;
			refreshUsage?.(session);
			setBanner(null);
			return session;
		} catch (err) {
			setSessionAsk((prev) => ({
				...prev,
				messages: [
					...(prev?.messages || []),
					{ role: "assistant", error: true, content: `Couldn't start a conversation. ${friendlyError(err)}` },
				],
			}));
			return null;
		}
	};

	const sendMessage = async (event) => {
		event.preventDefault();
		const question = input.trim();
		if (!question || streaming || !page) return;

		const session = sessionRef.current || (await ensureSession());
		if (!session) return;

		const userMsg = { role: "user", content: question };
		const assistantMsg = { role: "assistant", content: "" };

		setSessionAsk((prev) => ({
			...prev,
			messages: [...(prev?.messages || []), userMsg, assistantMsg],
		}));

		setInput("");
		setStreaming(true);

		try {
			const stream = session.promptStreaming(question);
			let full = "";

			for await (const chunk of stream) {
				full += chunk;
				setSessionAsk((prev) => {
					const list = [...(prev?.messages || [])];
					if (list.length > 0) {
						list[list.length - 1] = { role: "assistant", content: full };
					}
					return { ...prev, messages: list };
				});
			}
		} catch (err) {
			setSessionAsk((prev) => {
				const list = [...(prev?.messages || [])];
				if (list.length > 0) {
					list[list.length - 1] = {
						role: "assistant",
						error: true,
						content:
							err?.name === "QuotaExceededError"
								? "This question is too long for what's left of the conversation. Try asking something shorter."
								: `Couldn't answer that. ${friendlyError(err)}`,
					};
				}
				return { ...prev, messages: list };
			});
		} finally {
			setStreaming(false);
			refreshUsage?.(sessionRef.current);
		}
	};

	const onKeyDown = (event) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			event.currentTarget.form?.requestSubmit();
		}
	};

	return (
		<section id="panel-ask" className={`view${active ? " is-active" : ""}`} role="tabpanel" aria-labelledby="tab-ask" hidden={!active}>
			<div className="chat-log" ref={logRef} aria-live="polite">
				{messages.length === 0 ? (
					<p className="empty-state">Ask a question about this page.</p>
				) : (
					messages.map((message, index) => {
						const isLast = index === messages.length - 1;
						const text = message.content || message.text || "";
						return (
							<div
								key={index}
								className={`msg ${message.role === "user" ? "msg-user" : "msg-assistant"}${message.error ? " is-error" : ""}`}
							>
								{message.role === "assistant" && !message.error ? (
									text ? (
										<MarkdownOutput text={text} />
									) : streaming && isLast ? (
										<Skeleton />
									) : null
								) : (
									text
								)}
							</div>
						);
					})
				)}
			</div>

			<form className="chat-form" onSubmit={sendMessage}>
				<textarea
					className="chat-input"
					rows={1}
					value={input}
					onChange={(event) => setInput(event.target.value)}
					onKeyDown={onKeyDown}
					placeholder="Ask about this page…"
					aria-label="Ask about this page"
				/>
				<button type="submit" className="btn btn-primary" disabled={streaming || !input.trim()}>
					Send
				</button>
			</form>
		</section>
	);
}