export const normalizeUrl = (url) => {
	try {
		const u = new URL(url);
		u.hash = "";

		["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"]
			.forEach((p) => u.searchParams.delete(p));

		return u.href.replace(/\/$/, "");
	} catch {
		return url;
	}
};