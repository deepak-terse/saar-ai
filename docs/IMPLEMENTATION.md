# Implementation

Feature-level flows explaining how each part of Saar AI works, the approach taken, and notable tradeoffs.

---

## Content extraction

**Primary:** [@mozilla/readability](https://github.com/mozilla/readability) parses a cloned DOM and returns the main article content as cleaned HTML.

**Fallback:** If Readability returns less than 200 characters, a custom extractor walks the DOM, skipping non-content tags (nav, header, footer, aside, form, script, etc.), removing hidden elements (`aria-hidden="true"`, `display:none`, `visibility:hidden`, `inert`), and collecting visible text.

**Cleanup pipeline** (runs on both paths):
1. Remove entire sections under known headings — references, bibliography, related articles, comments, appendices, acknowledgements, etc.
2. Remove elements matching boilerplate patterns — newsletters, social share buttons, promotions, paywalls, table of contents, etc.
3. Strip hidden elements by computed style and ARIA attributes.
4. Normalize whitespace, collapse blank lines, trim.

**Metadata extraction:** Title, byline, site name, and excerpt are sourced from Readability output first, then Open Graph / Twitter meta tags, then document defaults.

**Truncation:** Output is capped at 30,000 characters (~75% of the model's ~8K-token context window). This leaves room for system prompt, instructions, and response generation.

**Tradeoff:** Readability is designed for articles and fails on SPAs, dashboards, and heavily JavaScript-rendered pages. The fallback handles some of these but is less precise. This is an acceptable tradeoff for a reading assistant — if the page isn't article-shaped content, there's less to summarize.

---

## Read view

1. **Load page:** Extract content, classify category. Controls are disabled until both complete.
2. **Check cache:** Look up `read:<normalized-url>` in session storage. If a summary exists for the selected mode, display it instantly.
3. **Select mode:** User clicks one of eight mode buttons. If cached, switch immediately. If not, trigger generation.
4. **Engine selection:**
   - *Summarizer API:* Highlights and TL;DR — uses `type` and `length` parameters with a formatting `instruction` as context.
   - *LanguageModel API:* All other modes — uses the common system prompt, a category-indexed instruction variant, and the page context block.
5. **Stream output:** Responses stream incrementally. The UI renders partial Markdown with a skeleton placeholder until the first chunk arrives.
6. **Cache result:** On completion, the full output is saved to session storage under the mode key. Switching back to a previously generated mode is instant.
7. **Track efficiency:** On first visit, the page is recorded in IndexedDB with word count and estimated read time. While the user reads the summary, elapsed time is tracked. The subheader shows minutes saved (estimated read time minus actual time spent).
8. **Cleanup:** The AI session is destroyed after each generation. If the user navigates to a different page mid-stream, the active engine is destroyed and state is reset.

**Tradeoff:** Each generation creates and destroys a new LanguageModel session. This avoids context pollution across modes but means the model can't reference prior summaries in the same session. For a read-focused tool, isolation is more predictable than shared context.

---

## Ask view

1. **Reset on page change:** Destroy the existing LanguageModel session and clear messages when the URL changes.
2. **Initialize session:** On the first question, create a session with:
   - System prompt: common instructions + Markdown formatting rules + grounding constraint.
   - Initial prompts: page content (title, URL, category, text up to 12K chars) seeded as a user/assistant exchange.
3. **Send question:** Append the user message and a placeholder assistant message. Stream the response, updating the last message as chunks arrive.
4. **Ground answers:** The system prompt explicitly instructs the model to answer only from page content and to say so when information is unavailable.
5. **Monitor context:** After each prompt, `refreshUsage()` reads `session.contextUsage` and updates the context bar in the header.
6. **Handle overflow:** A `contextoverflow` event listener injects a warning message into the chat. `QuotaExceededError` is caught and shown as a user-friendly message.
7. **Cleanup:** Session is destroyed on page change or component unmount.

**Tradeoff:** The chat session keeps all conversation turns in the same LanguageModel session for continuity. This means earlier context can be dropped by the model when the window fills up. A retrieval-based approach (fetching relevant chunks per question) would scale better for very long conversations but adds significant complexity for a side-panel tool.

---

## Quiz view

1. **Setup:** User selects Easy, Medium, or Hard difficulty.
2. **Chunk content:** The page text (up to 10K chars) is split into 5 equal parts. Each part covers a different segment of the content to ensure broad coverage.
3. **Build prompt:** A structured prompt is constructed with:
   - Difficulty-specific instructions (recall for Easy, inference for Medium, synthesis for Hard).
   - All 5 content parts.
   - Coverage state: recently asked topics and whether they were answered correctly, so the model avoids repetition and revisits incorrect concepts.
4. **Constrained output:** The prompt is sent with a `responseConstraint` JSON schema. The model must return an array of question objects with: `question`, `type` (single/multiple/true-false), `options`, `correctIndexes`, `explanation`, and `partIndex`.
5. **Validate:** The raw JSON response is parsed and validated — malformed questions, missing fields, or out-of-range indexes are filtered out.
6. **Answer flow:** User selects option(s), submits. The UI shows correct/incorrect feedback with the model's explanation. Progress bar tracks position within the batch.
7. **Batch results:** After completing all questions in a batch, show round score and cumulative score. User can continue (generates a new batch with updated coverage) or finish.
8. **Stats:** Per-difficulty breakdown (Easy/Medium/Hard correct/total), overall percentage, and a performance adjective are computed and displayed in the Quiz tab subheader.

**Tradeoff:** Using constrained JSON output (`responseConstraint`) produces reliably structured quiz data but limits the model's flexibility. Occasionally the model may produce a valid JSON structure with a mediocre question. The validation step catches structural issues; question quality depends on the model and the source content.

---

## AI output sanitization

On-device models (Gemini Nano) sometimes produce malformed Markdown, especially for tables and Mermaid diagrams. The `sanitizeMarkdown` pipeline fixes common issues before rendering:

| Issue | Fix |
|---|---|
| Single-line table (header + separator + data on one line) | Split into proper multi-line table rows |
| Separator row with wrong column count (`\|---\|` instead of `\|---\|---\|---\|`) | Rebuild separator to match header |
| Bare mermaid diagram (no fences) | Detect diagram keyword, wrap in ` ```mermaid ``` ` fences |
| Space-separated arrays in mermaid (`[10 20 30]`) | Convert to comma-separated (`[10, 20, 30]`) |

The MermaidChart component also validates diagrams with `mermaid.parse()` before rendering to prevent "Syntax error" messages. During streaming, incomplete diagrams show a "Rendering chart…" placeholder.

---

## Content classification

Classification uses a lightweight single-turn prompt over the first 2,000 characters. The model responds with a single number (1, 2, or 3). The result is cached per URL in session storage.

**Why classify:** Different content types benefit from different summary structures. A research paper's Abstract should show Objective/Approach/Findings/Conclusion. A blog post's Abstract should show Theme/Core Argument/Evidence/Takeaway. A narrative should show Premise/Conflict/Climax/Resolution. Classification makes this automatic.

**Fallback:** If classification fails (AI unavailable, timeout, unexpected output), the default is category 1 (Article/Research) — the most conservative and broadly applicable.

---

## Storage design

**Why three tiers:**
- Session storage is fast and automatically cleared when the browser closes — ideal for transient AI outputs that don't need to persist.
- Local storage persists across sessions — used for aggregate metrics that should survive browser restarts.
- IndexedDB handles structured per-page records with larger storage capacity — used for page metadata, word counts, and reading time.

**Unified access:** The `storage.js` router inspects the key prefix and dispatches to the correct backend. The `useStorage` hook provides a React-friendly interface: synchronous reads from an in-memory cache, async hydration from the backing store, reactive updates via change listeners, and automatic write-through on state changes.

**Tradeoff:** Three storage tiers add complexity. A single IndexedDB store could handle everything, but session storage's automatic cleanup prevents stale summary data from accumulating, and local storage's simplicity is appropriate for two scalar metrics. The unified router abstracts this so components don't need to know which tier they're using.