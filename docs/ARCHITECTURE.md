# Architecture

High-level design of how Saar AI is structured and how data flows through the system.

## System flow

```text
Web Page
    ↓
Content Extractor (Readability → fallback)
    ↓
Content Classifier (LanguageModel → category 1/2/3)
    ↓
┌─────────────┬─────────────┬─────────────┐
│  Read View  │  Ask View   │  Quiz View  │
│  8 summary  │  grounded   │  structured │
│  modes      │  chat       │  MCQs       │
└─────────────┴─────────────┴─────────────┘
    ↓               ↓               ↓
Streamed output  Context-aware   Constrained
via Markdown     conversation    JSON schema
    ↓               ↓               ↓
Three-tier storage (session · local · IndexedDB)
```

## Component structure

```text
src/
├── App.jsx                     # Root: state, AI availability, tab routing
├── components/
│   ├── Header.jsx              # Status, context badge, per-tab subheader
│   ├── Banner.jsx              # Error / progress / info messages
│   ├── Tabs.jsx                # Read / Ask / Quiz tab navigation
│   ├── ReadView.jsx            # Mode grid, summary generation, efficiency tracking
│   ├── AskView.jsx             # Chat interface with streaming responses
│   ├── QuizView.jsx            # Quiz setup, question flow, scoring
│   ├── MarkdownOutput.jsx      # Markdown + GFM tables + Mermaid + KaTeX rendering
│   └── LifetimeEfficiencyDashboard.jsx  # Cumulative hours saved / pages condensed
├── constants/
│   ├── modes.js                # Mode definitions, category config, quiz difficulty
│   └── systemPrompt.js         # Common system instructions, prompt context builder
├── content/
│   └── extractor.js            # Page extraction: Readability + fallback + cleanup
├── hooks/
│   ├── usePageContent.js       # Page extraction, tab listeners, auto-classification
│   ├── useAIContext.js         # Context window / usage monitoring
│   └── useStorage.js           # Reactive hook over the unified storage layer
├── services/
│   ├── ai.js                   # Summarizer + LanguageModel API wrappers
│   ├── classify.js             # Content category classification
│   ├── storage.js              # Unified storage router (session / local / IndexedDB)
│   ├── sessionStorage.js       # chrome.storage.session with in-memory cache
│   ├── localStorage.js         # chrome.storage.local with change listeners
│   ├── indexedDB.js            # IndexedDB for per-page persistent records
│   ├── metrics.js              # Reading time, pages visited, savings calculations
│   └── chrome.js               # Active tab content extraction via scripting API
└── utils/
    ├── quiz.js                 # Chunking, prompt building, schema, validation, stats
    ├── sanitizeMarkdown.js     # Table repair, mermaid wrapping, syntax fixups
    ├── rendering.js            # Friendly error messages
    └── url.js                  # URL normalization
```

## Storage model

Three tiers, each chosen for its lifetime and capacity characteristics.

| Tier | Backend | Lifetime | Used for |
|---|---|---|---|
| Session | `chrome.storage.session` + in-memory Map | Browser session | Summaries, chat messages, quiz state, category cache |
| Local | `chrome.storage.local` | Persists across sessions | Aggregate metrics (sites visited, seconds saved) |
| IndexedDB | `saar_db` → `pages` store | Persists across sessions | Per-page records (word count, category, reading time) |

A unified `storage.js` router resolves the correct backend based on key prefix. The `useStorage` hook provides a reactive React binding — reads synchronously from cache on mount, subscribes to changes, and writes back automatically.

**Key prefix routing:**

```text
read:*  ask:*  session:*  cache:*  saar:*  →  Session storage
http://*  page:*  idb:*                     →  IndexedDB
siteVisited  secondsSaved                   →  Local storage
```

## Content classification

Before any AI generation, the page is classified into one of three categories:

| Category | Content types |
|---|---|
| 1 — Article / Research | Article, research paper, white paper, case study, e-book |
| 2 — Blog / Opinion | Blog post, newsletter, opinion piece, editorial |
| 3 — Story / Narrative | Story, narrative, memoir, personal essay |

Classification uses a lightweight LanguageModel prompt over the first 2,000 characters. The result is cached per URL for the session.

Modes that benefit from category awareness (TL;DR, Abstract, Limitations, Actions & Takeaways) use category-indexed instruction variants — the same mode produces structurally different output depending on content type.

## Context window management

The `useAIContext` hook probes the LanguageModel API on mount to read the total context window size. During Ask conversations, it tracks:

- `contextUsage` — tokens consumed so far
- `remaining` — tokens available
- `usagePercent` — displayed as a progress bar in the Ask tab subheader

When the context overflows, Chrome fires a `contextoverflow` event. Saar AI catches this and warns the user that earlier messages may be dropped.

## AI output pipeline

On-device models don't always produce well-formed output. Saar AI post-processes all AI responses before rendering:

```text
Raw AI text
    ↓
sanitizeMarkdown()
  ├── repairTables()          — fix single-line tables, mismatched separator columns
  ├── wrapBareMermaidBlocks() — detect bare diagram keywords, add fences
  └── fixMermaidSyntax()      — fix missing commas in arrays
    ↓
ReactMarkdown + remark-gfm + remark-math + rehype-katex
    ↓
MermaidChart component (validate → render, with streaming placeholder)
```

## Reading efficiency tracking

When a page is first opened, Saar AI records it in IndexedDB with word count, estimated read time, and category. As the user reads summaries, elapsed time is tracked and committed to storage.

The savings calculation:

```text
minutesSaved = max(1, round((estimatedReadTime − actualTimeSpent) / 60))
```

Lifetime metrics (total hours saved, total pages condensed) are stored in `chrome.storage.local` and displayed in the `LifetimeEfficiencyDashboard` on the Read tab's initial state.
