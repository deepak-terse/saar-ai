export const LOW_VARIANCE_OPTIONS = { topK: 1, temperature: 0 };

export const MODES = {
  highlights: {
    label: "Highlights",
    engine: "summarizer",
    type: "key-points",
    length: "medium",
    description: "Key points, important facts, and notable insights from the page.",
  },
  tldr: {
    label: "TL;DR",
    engine: "summarizer",
    type: "tldr",
    length: "short",
    description: "The shortest possible summary of what the page is saying and why it matters.",
  },
  abstract: {
    label: "Abstract",
    engine: "prompt",
    description: "Structured overview of the purpose, approach, key findings, and conclusion.",
    instruction: `Write a structured overview of this page in exactly four labeled lines, each starting with the label and a colon, in this exact order:
Purpose: <one sentence on what this content sets out to do>
Approach: <one sentence on the method, angle, or approach taken>
Key Findings: <one to two sentences on the main results or claims>
Conclusion: <one sentence on the overall takeaway>
Do not add any other text before, between, or after these four lines.`,
  },
  limitations: {
    label: "Limitations",
    engine: "prompt",
    description: "What the source cannot establish, its gaps, caveats, and suggested future research.",
    instruction: `List the limitations, gaps, and caveats of this content as short bullet lines (start each with "- "). Cover what the source does NOT establish or leave unaddressed. End with one bullet suggesting a direction for future research or follow-up. Write 4-6 bullets total. Base this only on what's stated or reasonably implied by the page content — do not invent limitations the text doesn't support.`,
  },
  actions: {
    label: "Actions & Takeaways",
    engine: "prompt",
    description: "Specific recommendations, next steps, and decisions you can take from the content.",
    instruction: `List specific, concrete recommendations, next steps, or decisions a reader could take based on this content, as short bullet lines (start each with "- "). Write 3-6 bullets. Each should be an action, not just an observation — start with a verb where possible (e.g. "Review...", "Consider...", "Avoid...").`,
  },
  qa: {
    label: "Q&A",
    engine: "prompt",
    description: "The most important questions about the content, answered clearly and concisely.",
    instruction: `Write the 4-6 most important questions a reader would have about this content, each as two lines:
Q: <question>
A: <clear, concise answer grounded in the page content>
Leave a blank line between each question/answer pair.`,
  },
  glossary: {
    label: "Glossary",
    engine: "prompt",
    description: "Key technical or unfamiliar terms with simple, contextual definitions.",
    instruction: `Identify 4-8 technical or unfamiliar terms actually used on this page. For each, write one line as:
Term: simple, contextual definition (one sentence).
Only include terms that genuinely appear on the page and would likely be unfamiliar to a general reader.`,
  },
  "data-snapshot": {
    label: "Data Snapshot",
    engine: "prompt",
    description: "Important numbers, metrics, statistics, trends, and quantitative findings.",
    chart: true,
    instruction: `Extract the important numbers, statistics, metrics, and quantitative findings from this page, as short bullet lines (start each with "- "), one metric per line, in the form:
- Label: value
Keep each label short (a few words) and each value exact as stated on the page (include units, e.g. %, x, or a plain number). If a value is a percentage, write it as a number followed by a percent sign with no space (e.g. 42%). If the page has no meaningful numeric data, write a single line: "No specific data or metrics were found on this page."`,
  },
};

export const QUIZ_PARTS = 5;

export const QUIZ_DIFFICULTY_INSTRUCTIONS = {
  easy: "Ask straightforward questions that test recall of facts and definitions explicitly stated in the text. Avoid trick questions, subtle inference, or ambiguous wording.",
  medium: "Ask questions that require connecting two related ideas from the text or applying a stated concept, not just recalling an isolated fact.",
  hard: 'Ask challenging questions that require synthesizing multiple details, spotting a common misconception, or evaluating nuance. Where the content supports it, prefer questions with more than one correct option (type "multiple") to test deeper understanding.',
};