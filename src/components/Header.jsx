export const Header = ({
	status,
	contextWindow,
	activeTab = "read",
	page,
	hasSummary = false,
	minutesSaved = 0,
	contextUsage = 0,
	remaining = null,
	usagePercent = 0,
	quizMastery = { correct: 0, total: 0 },
}) => {
	const title =
		status === "ready"
			? "On-device AI ready"
			: status === "busy"
			? "Working…"
			: "On-device AI unavailable";

	const rawWords = page?.wordCount;
	const wordCount =
		typeof rawWords === "number"
			? rawWords
			: Array.isArray(rawWords)
			? rawWords.length
			: page?.text
			? page.text.trim().split(/\s+/).filter(Boolean).length
			: 0;
	const readTime = wordCount > 0 ? Math.max(1, Math.round(wordCount / 200)) : 0;
	const displayMinutesSaved = minutesSaved > 0 ? minutesSaved : (readTime > 1 ? Math.max(1, readTime - 1) : 1);

	return (
		<header className="app-header">
			<div className="app-header-top">
				<div className="brand">
					<span className="brand-mark" aria-hidden="true" />
					<span className="brand-name">Saar AI</span>
				</div>
				<div className="app-header-actions">
					{contextWindow != null && (
						<span className="context-badge" title="Total context window for the on-device model">
							{contextWindow.toLocaleString()} tokens
						</span>
					)}
					<span className={`status-dot ${status}`} title={title} />
				</div>
			</div>

			<div className={`app-header-subheader subheader-mode-${activeTab}${hasSummary && activeTab === "read" ? " is-reward" : ""}`}>
				{activeTab === "read" && (
					hasSummary ? (
						<div className="subheader-reward-banner" role="status" aria-live="polite">
							<span className="reward-icon" aria-hidden="true">🎉</span>
							<span className="reward-text">
								<strong>{displayMinutesSaved} {displayMinutesSaved === 1 ? "Minute" : "Minutes"} Saved</strong> on this page
							</span>
						</div>
					) : wordCount > 0 ? (
						<div className="subheader-page-meta">
							<span className="meta-icon" aria-hidden="true">📄</span>
							<span className="meta-item">{wordCount.toLocaleString()} words</span>
							<span className="meta-bullet" aria-hidden="true">•</span>
							<span className="meta-icon" aria-hidden="true">⏱️</span>
							<span className="meta-item">{readTime} min read</span>
						</div>
					) : (
						<div className="subheader-page-meta">
							<span className="meta-icon" aria-hidden="true">📄</span>
							<span className="meta-item">Reading page…</span>
						</div>
					)
				)}

				{activeTab === "ask" && (
					<div className="subheader-context-bar-wrapper" title="Context window usage">
						<div className="context-bar">
							<div
								className={`context-bar-fill${usagePercent >= 85 ? " is-warning" : ""}`}
								style={{ width: `${Math.min(100, usagePercent)}%` }}
							/>
						</div>
						<span className="context-meta">
							{contextUsage.toLocaleString()} used · {remaining != null ? remaining.toLocaleString() : "—"} left
						</span>
					</div>
				)}

				{activeTab === "quiz" && (
					<div className="subheader-quiz-mastery" role="status">
						<span className="mastery-icon" aria-hidden="true">🧠</span>
						<span className="mastery-text">
							Mastery: <strong>{quizMastery?.correct ?? 0} / {quizMastery?.total ?? 0} Correct</strong>
						</span>
					</div>
				)}
			</div>
		</header>
	);
};