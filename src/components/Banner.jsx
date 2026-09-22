export const Banner = ({ banner }) => {
	if (!banner) return null;
	const text = typeof banner === "string" ? banner : banner?.text;
	const kind = typeof banner === "object" ? banner?.kind : "info";
	if (!text) return null;

	return (
		<div className={`banner${kind === "error" ? " error" : ""}`} role="status">
			{text}
		</div>
	);
}