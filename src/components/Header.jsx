import { calculateQuizStats } from "../utils/quiz";

const STATUS_TITLES = {
	ready: "Ready",
	unsupported: "Unsupported",
	unavailable: "Unavailable",
	error: "Unavailable",
	busy: "Working…",
};

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
	quizStats = null,
	quizMastery = null,
}) => {
	const title = STATUS_TITLES[status] || "Unavailable";

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

	const currentQuizStats =
		quizStats ||
		(quizMastery
			? calculateQuizStats([{ mode: "medium", correct: quizMastery.correct, total: quizMastery.total }])
			: calculateQuizStats([], null));

	return (
		<header className="app-header">
			<div className="app-header-top">
				<div className="app-header-actions">
					<span className={`status-dot ${status}`} title={title} />
					<span className="status-label">{title}</span>
				</div>
				<div className="brand">
					{contextWindow != null && (
						<span className="context-badge" title="Total context window for the on-device model">
							Context: {contextWindow.toLocaleString()} tokens
						</span>
					)}
				</div>
			</div>

			<div className={`app-header-subheader subheader-mode-${activeTab}${hasSummary && activeTab === "read" ? " is-reward" : ""}`}>
				{activeTab === "read" && (
					hasSummary ? (
						<div className="subheader-reward-banner" role="status" aria-live="polite">
							<span className="reward-icon" aria-hidden="true">🎉</span>
							<span className="reward-text">
								<strong>{displayMinutesSaved} {displayMinutesSaved === 1 ? "Minute" : "Minutes"} saved</strong>
								<span className="meta-bullet" aria-hidden="true">•</span>
								<span className="meta-item">{readTime} min original read</span>
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
					<div className="subheader-quiz-stats" role="status" aria-label="Quiz performance summary">
						<div className="subheader-quiz-row subheader-quiz-summary">
							<span className="quiz-stat-item">{currentQuizStats.totalCorrect}/{currentQuizStats.totalAnswered} correct</span>
							<span className="quiz-bullet" aria-hidden="true">·</span>
							<span className="quiz-stat-item">{currentQuizStats.percentage}%</span>
							<span className="quiz-bullet" aria-hidden="true">·</span>
							<span className={`quiz-adjective ${currentQuizStats.adjectiveClass || ""}`}>
								{currentQuizStats.adjective}
							</span>
						</div>
						<div className="subheader-quiz-row subheader-quiz-breakdown">
							<span className="quiz-breakdown-item">
								Easy {currentQuizStats.breakdown?.easy?.correct ?? 0}/{currentQuizStats.breakdown?.easy?.total ?? 0}
							</span>
							<span className="quiz-bullet" aria-hidden="true">·</span>
							<span className="quiz-breakdown-item">
								Medium {currentQuizStats.breakdown?.medium?.correct ?? 0}/{currentQuizStats.breakdown?.medium?.total ?? 0}
							</span>
							<span className="quiz-bullet" aria-hidden="true">·</span>
							<span className="quiz-breakdown-item">
								Hard {currentQuizStats.breakdown?.hard?.correct ?? 0}/{currentQuizStats.breakdown?.hard?.total ?? 0}
							</span>
						</div>
					</div>
				)}
			</div>
		</header>
	);
};