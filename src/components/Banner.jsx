export const Banner = ({ banner }) => {
	if (!banner) return null;
	return (
		<div className={`banner${banner.kind === "error" ? " error" : ""}`} role="status">
			{banner.text}
		</div>
	);
}