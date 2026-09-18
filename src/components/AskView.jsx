import { useEffect, useRef, useState } from "react";
import { createLanguageModel, getLanguageModelAvailability } from "../services/ai";
import { CONTENT_CATEGORIES } from "../constants/modes";
import { COMMON_SYSTEM_INSTRUCTIONS } from "../constants/systemPrompt";
import { friendlyError } from "../utils/rendering";

const INITIAL_MESSAGE = "Ask a question about this page.";

export const AskView = ({ active, page, setBanner, category }) => {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [streaming, setStreaming] = useState(false);
	const sessionRef = useRef(null);
	const logRef = useRef(null);

	useEffect(() => {
		sessionRef.current?.destroy?.();
		sessionRef.current = null;
		setMessages([]);

		return () => {
			sessionRef.current?.destroy?.();
			sessionRef.current = null;
		};
	}, [page]);

	useEffect(() => {
		const log = logRef.current;
		if (log) log.scrollTop = log.scrollHeight;
	}, [messages]);

	const ensureSession = async () => {
		if (sessionRef.current || !page) return sessionRef.current;

		const availability = await getLanguageModelAvailability();
		if (availability === "unavailable") return null;

		try {
			const session = await createLanguageModel({
				initialPrompts: [
					{
						role: "system",
						content:
							`${COMMON_SYSTEM_INSTRUCTIONS}\n\nAnswer questions using only the page content provided below. If the answer isn't in the page, say so plainly instead of guessing.${category && CONTENT_CATEGORIES[category] ? `\n\nThis content has been classified as: ${CONTENT_CATEGORIES[category].types}. Tailor your responses to this content type.` : ""}\n\nTitle: ${page.title}\nURL: ${page.url}\n\n${page.text}`,
					},
				],
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

			session.addEventListener("contextoverflow", () => {
				setMessages((current) => [
					...current,
					{
						role: "assistant",
						text: "This conversation is getting long — earlier messages may be dropped from context.",
					},
				]);
			});

			sessionRef.current = session;
			setBanner(null);
			setMessages([{ role: "assistant", text: INITIAL_MESSAGE }]);
			return session;
		} catch (err) {
			setMessages([
				{ role: "assistant", error: true, text: `Couldn't start a conversation. ${friendlyError(err)}` },
			]);
			return null;
		}
	}

	const sendMessage = async (event) => {
		event.preventDefault();
		const question = input.trim();
		if (!question || streaming) return;

		const session = sessionRef.current || (await ensureSession());
		if (!session) return;

		setMessages((current) => [...current, { role: "user", text: question }, { role: "assistant", text: "" }]);
		setInput("");
		setStreaming(true);

		try {
			const stream = session.promptStreaming(question);
			let full = "";

			for await (const chunk of stream) {
				full += chunk;
				setMessages((current) => {
					const next = [...current];
					const last = next.length - 1;
					next[last] = { role: "assistant", text: full };
					return next;
				});
			}
		} catch (err) {
			setMessages((current) => {
				const next = [...current];
				next.pop();
				next.push({
					role: "assistant",
					error: true,
					text:
						err?.name === "QuotaExceededError"
							? "This question is too long for what's left of the conversation. Try asking something shorter, or start over."
							: `Couldn't answer that. ${friendlyError(err)}`,
				});
				return next;
			});
		} finally {
			setStreaming(false);
		}
	}

	const onKeyDown = (event) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			event.currentTarget.form?.requestSubmit();
		}
	}

	return (
		<section id="panel-ask" className={`view${active ? " is-active" : ""}`} role="tabpanel" aria-labelledby="tab-ask" hidden={!active}>
			<div className="chat-log" ref={logRef} aria-live="polite">
				{messages.length === 0 ? (
					<p className="empty-state">Ask a question about this page once it loads.</p>
				) : (
					messages.map((message, index) => (
						<div
							key={index}
							className={`msg ${message.role === "user" ? "msg-user" : "msg-assistant"}${message.error ? " is-error" : ""
								}`}
						>
							{message.text}
						</div>
					))
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
				<button type="submit" className="btn btn-primary" disabled={streaming}>
					Send
				</button>
			</form>
		</section>
	);
}