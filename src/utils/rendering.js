export function parsePromptLines(text) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function getPercentItems(lines) {
  const items = [];
  const re = /^-?\s*([^:]{1,40}):\s*(-?\d+(?:\.\d+)?)\s*%$/;

  for (const line of lines) {
    const clean = line.replace(/^[-*]\s+/, "");
    const match = clean.match(re);
    if (match) {
      items.push({
        label: match[1].trim(),
        value: Math.max(0, Math.min(100, parseFloat(match[2]))),
      });
    }
  }
  return items;
}

export function renderLabeledText(line) {
  const match = line.match(/^([A-Za-z][A-Za-z &]{0,24}:)\s*(.*)$/);
  return match
    ? { label: match[1], value: match[2] }
    : { label: null, value: line };
}

export function friendlyError(err) {
  if (err?.name === "NotSupportedError") return "This page's content isn't supported.";
  if (err?.name === "AbortError") return "The request was cancelled.";
  return "Please try again.";
}