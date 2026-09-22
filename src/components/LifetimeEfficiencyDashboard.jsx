export const LifetimeEfficiencyDashboard = ({ metrics }) => {
	const hoursSaved =
		metrics?.hoursSaved != null
			? metrics.hoursSaved
			: metrics?.secondsSaved != null
				? Math.round((metrics.secondsSaved / 3600) * 10) / 10
				: 0;

	const sitesCount =
		metrics?.siteVisited != null
			? metrics.siteVisited
			: metrics?.articlesCondensed != null
				? metrics.articlesCondensed
				: 0;

	return (
		<div className="lifetime-dashboard" role="region" aria-label="Lifetime Efficiency Dashboard">
			<div className="lifetime-badge">Cumulative Reading Impact</div>
			<div className="lifetime-metrics-container">
				<div className="lifetime-metric-pill">
					<span className="lifetime-icon" aria-hidden="true">⏱️</span>
					<div className="lifetime-text-group">
						<span className="lifetime-number">{hoursSaved}</span>
						<span className="lifetime-unit">Hours Saved</span>
					</div>
				</div>

				<div className="lifetime-divider" aria-hidden="true">|</div>

				<div className="lifetime-metric-pill">
					<span className="lifetime-icon" aria-hidden="true">📄</span>
					<div className="lifetime-text-group">
						<span className="lifetime-number">{sitesCount}</span>
						<span className="lifetime-unit">Sites Visited</span>
					</div>
				</div>
			</div>
			<p className="lifetime-prompt">Select a summary mode above to condense this page</p>
		</div>
	);
};
