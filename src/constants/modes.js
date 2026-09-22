export const LOW_VARIANCE_OPTIONS = { topK: 1, temperature: 0 };

export const CONTENT_CATEGORIES = {
	1: { label: "Article / Research", types: "article, research paper, white paper, case study, or e-book" },
	2: { label: "Blog / Opinion", types: "blog post, newsletter, opinion piece, or editorial" },
	3: { label: "Story / Narrative", types: "story, narrative, memoir, or personal essay" },
};

export const CATEGORY_CLASSIFICATION_PROMPT = (title, url, text) =>
	`Classify this page into exactly one category. Respond with ONLY the number 1, 2, or 3.

CATEGORY 1: Article, research paper, white paper, case study, or e-book
CATEGORY 2: Blog post, newsletter, opinion piece, or editorial
CATEGORY 3: Story, narrative, memoir, or personal essay

Page title: ${title}
Page URL: ${url}

Page content (excerpt):
"""
${text.slice(0, 2000)}
"""

Category number:`;


export const MODES = {
	highlights: {
		label: "Highlights",
		engine: "summarizer",
		type: "key-points",
		length: "medium",
		description: "Key points, important facts, and notable insights from the page.",
		instruction: `List 5–7 key points as Markdown bullets (start each with "- "). Use **bold** for the main keyword or phrase in each bullet. Use only information present on the page; do not infer or add facts. If fewer than 5 meaningful points exist, list what's available.`,
	},
	tldr: {
		label: "TL;DR",
		engine: "summarizer",
		type: "tldr",
		length: "short",
		description: "The shortest possible summary of what the page is saying and why it matters.",
		instruction: [
			`Write one sentence that states the main point and why it matters. Use **bold** for the single most important phrase. Use only information present on the page. Ensure the tone is objective, formal, and results-oriented.`,
			`Write one sentence that states the author's primary argument or message and why it matters to the reader. Use **bold** for the single most important phrase. Use only information present on the page. Match the engaging, conversational tone of the text.`,
			`Write one sentence that captures the central plot line or thematic essence of the narrative and why it matters. Use **bold** for the single most important phrase. Use only information present on the page.`
		]
	},
	abstract: {
		label: "Abstract",
		engine: "prompt",
		description: "Structured overview adapted to content type: research/articles use Purpose/Approach/Findings/Conclusion; blogs/stories use Hook/Core Idea/Highlights/Takeaway.",
		instruction: [
			`Analyze the text and output exactly four labeled paragraphs using Markdown. Use **bold** for each label. Separate each paragraph with a blank line. No intro, outro, or extra commentary. Base it strictly on the text; if an item is missing, write "Not stated."

**Objective:** one sentence on the core question, problem, or goal this content addresses

**Approach:** one sentence on the method, data sources, or specific angle taken

**Key Findings:** one to two short sentences on the main data points, discoveries, or core arguments

**Conclusion:** one sentence on the final resolution, impact, or recommended next steps`,
			`Analyze the text and output exactly four labeled paragraphs using Markdown. Use **bold** for each label. Separate each paragraph with a blank line. No intro, outro, or extra commentary. Base it strictly on the text; if an item is missing, write "Not stated."

**Theme:** one sentence on the central idea, trending topic, or spark that triggered the post

**Core Argument:** one sentence on the main opinions, tips, or commentary shared by the author

**Supporting Evidence:** one to two short sentences on the examples, anecdotes, or references used to back up the claim

**Takeaway:** one sentence on what the reader is supposed to think, feel, or do next`,
			`Analyze the text and output exactly four labeled paragraphs using Markdown. Use **bold** for each label. Separate each paragraph with a blank line. No intro, outro, or extra commentary. Base it strictly on the text; if an item is missing, write "Not stated."

**Premise:** one sentence on the background context, characters, or initial state of affairs

**Conflict:** one sentence on the event that disrupts the status quo or the core challenge faced

**Climax:** one to two short sentences on the highest point of tension or the moment of realization

**Resolution:** one sentence on how the situation resolves and the underlying message or moral`
		],
	},
	limitations: {
		label: "Limitations",
		engine: "prompt",
		description: "What the source cannot establish, its gaps, caveats, and suggested future research.",
		instruction: [
			`List 4–6 Markdown bullets (start each with "- "). Do NOT include a header. Use **bold** for the core gap in each bullet. Cover only analytical limitations, methodological gaps, data constraints, or caveats stated or reasonably implied by the page. Do not invent limitations. End with one bullet suggesting a specific direction for future research or data follow-up.`,
			`List 4–6 Markdown bullets (start each with "- "). Do NOT include a header. Use **bold** for the core gap in each bullet. Cover only biases, subjective gaps, logical caveats, or boundaries of the author's opinion stated or reasonably implied by the page. Do not invent limitations. End with one bullet suggesting a direction for a follow-up discussion or deeper exploration.`,
			`List 4–6 Markdown bullets (start each with "- "). Do NOT include a header. Use **bold** for the core gap in each bullet. Cover only limits in the perspective, emotional gaps, unaddressed character details, or context omitted or reasonably implied by the narrative structure. Do not invent details. End with one bullet suggesting a direction for a follow-up chapter or sequel inquiry. If no narrative gaps exist, output exactly: "- No narrative limitations stated."`
		]
	},
	actions: {
		label: "Actions & Takeaways",
		engine: "prompt",
		description: "Specific recommendations, next steps, and decisions you can take from the content.",
		instruction: [
			`List 3–6 Markdown bullets (start each with "- "). Do NOT include a header. Use **bold** for the action verb that starts each bullet (e.g., "- **Review** the quarterly metrics…"). Each must be a concrete action starting with a verb. Use only information present on the page.`,
			`List 3–6 Markdown bullets (start each with "- "). Do NOT include a header. Use **bold** for the action verb that starts each bullet (e.g., "- **Consider** adopting…"). Each must be a practical takeaway, conceptual habit, or lifestyle adjustment starting with an active verb. Use only information present on the page.`,
			`List 3–6 Markdown bullets (start each with "- "). Do NOT include a header. Use **bold** for the action verb that starts each bullet (e.g., "- **Reflect on** the moral…"). Each must be an emotional takeaway, core moral lesson, or reflective observation starting with an active verb. Use only information present on the page.`
		]
	},
	qa: {
		label: "Q&A",
		engine: "prompt",
		description: "The most important questions about the content, answered clearly and concisely.",
		instruction: `Write 4–6 question/answer pairs using Markdown. Do NOT include a header. Format each pair exactly as shown below — note the blank line between Q and A, and the --- horizontal rule between pairs:

**Q:** first question text

**A:** clear, concise answer grounded in the page content

---

**Q:** second question text

**A:** answer text

---

Follow this exact pattern for every pair. The blank line between Q and A is required. Each answer must be 50 words or fewer. Use only information present on the page; if unknown, answer "Not stated."`,
	},
	glossary: {
		label: "Glossary",
		engine: "prompt",
		description: "Key technical or unfamiliar terms with simple, contextual definitions.",
		instruction: `Identify 4–8 technical or unfamiliar terms actually used on this page.

Rules:
- Output ONLY a flat Markdown bullet list.
- Do NOT use headers (##), numbered lists, sub-bullets, or tables.
- Every line must start with "- " at the root level — no indentation, no nesting.
- Each bullet must follow this exact pattern:

- **Term Name**: one-sentence contextual definition.

Only include terms that appear on the page and would likely be unfamiliar to a general reader.`,
	},
	"data-snapshot": {
		label: "Data Snapshot",
		engine: "prompt",
		description: "Important numbers, metrics, statistics, trends, and quantitative findings.",
		instruction: `Identify meaningful quantitative data from the content that helps the reader understand its main subject.

The presence of numbers does NOT mean a Data Snapshot is required. Prioritize factual accuracy and relevance over completeness. When uncertain, exclude the data.

Selection rules:
Include a value only when:
- It is explicitly supported by the content.
- Its meaning and context are clear.
- It is relevant to the main subject.
- It provides useful information to the reader.

Ignore numbers that are merely incidental to the content, unless the number itself represents an important finding or metric.
Do not combine unrelated numbers into a dataset.

Consider the content category when judging whether quantitative information is meaningful:
- Article / Research
- Blog / Opinion
- Story / Narrative

Visualization rules:
Create a chart only when there is a clearly related group of comparable values.
- Use \`pie\` for parts of a meaningful whole or proportions.
- Use \`xychart-beta\` for meaningful comparisons or trends.
- Do not force a chart when the data is not naturally chartable.
- If meaningful quantitative information exists but is better represented as individual metrics, use a Markdown table.
- If the content does not contain meaningful quantitative data, output exactly: No meaningful quantitative data found.

Factual accuracy
- Use only information explicitly supported by the content.
- Never invent, infer, estimate, or calculate values.
- Preserve the original meaning, units, ranges, and approximate/uncertain wording.
- Do not turn examples, opinions, or recommendations into factual measurements.

## Output

Do not include a header or explanation.

Return only one of:
1. One or more - Mermaid charts, bullet points or table
2. 'No meaningful quantitative data found.'

Mermaid formatting:
The opening and closing Mermaid fences must start at column 0 with no leading whitespace.

Pie chart:

\`\`\`mermaid
pie title Market Share
    "Product A" : 45
    "Product B" : 30
    "Product C" : 25
\`\`\`

Bar/trend chart:

\`\`\`
xychart-beta
    title "Revenue"
    x-axis [2021, 2022, 2023]
    y-axis "USD M" 0 --> 100
    bar [25, 55, 80]
\`\`\`

- Keep labels short.
- Use only letters, numbers, and spaces in labels.
- Do not use special characters in labels.
- Numeric arrays must contain numbers only.
- Ensure the Mermaid block is syntactically complete.

Table formatting
Use a Markdown table when the data contains multiple related metrics or values that are clearer in tabular form.
Choose columns based on the data. Do not force all data into a fixed schema.
Keep tables concise and use only columns that are meaningful for the data.

Example:
| Country | Population | Growth |
| --- | --- | --- |
| India | 1.4B | 0.8 pct |
| US | 340M | 0.5 pct |

Bullets
Use concise Markdown bullets when the quantitative information consists of a small number of standalone findings that do not naturally form a table.

Example:
Participants: 2,500 people
Improvement: 68 pct reported improvement
Study duration: 12 weeks

Final check

Before responding, verify:
- The data is meaningful and relevant.
- Related values actually belong together.
- The selected visualization is appropriate.
- Every value is directly supported by the content.
- You are not forcing a chart or table simply because numbers exist.

If these conditions are not met, output: No meaningful quantitative data found.`,
	},
};

export const QUIZ_PARTS = 5;

export const QUIZ_DIFFICULTY_INSTRUCTIONS = {
	easy: "Ask straightforward questions that test recall of facts and definitions explicitly stated in the text. Avoid trick questions, subtle inference, or ambiguous wording.",
	medium: "Ask questions that require connecting two related ideas from the text or applying a stated concept, not just recalling an isolated fact.",
	hard: 'Ask challenging questions that require synthesizing multiple details, spotting a common misconception, or evaluating nuance. Where the content supports it, prefer questions with more than one correct option (type "multiple") to test deeper understanding.',
};