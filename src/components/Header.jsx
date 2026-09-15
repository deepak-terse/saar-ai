export const Header = ({ status }) => {
	const title = status === "ready" ? "On-device AI ready" : status === "busy" ? "Working…" : "On-device AI unavailable";

	return (
		<header className="app-header">
			<div className="brand">
				<span className="brand-mark" aria-hidden="true" />
				<span className="brand-name">Saar AI</span>
			</div>
			<span className={`status-dot ${status}`} title={title} />
		</header>
	);
}