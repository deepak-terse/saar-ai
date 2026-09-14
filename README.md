# Saar AI

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tech](https://img.shields.io/badge/Tech-Chrome%20Extension-yellow.svg)](https://developer.chrome.com/docs/extensions/)
[![AI: On-Device LLM](https://img.shields.io/badge/AI-On--Device%20LLM-purple.svg)](https://developer.chrome.com/docs/ai/)

> A Chrome extension that turns any web page into a focused reading experience — entirely on-device.

Saar AI runs as a side panel in Chrome. It reads the current page, generates concise summaries in multiple formats, answers your questions about the content, and lets you test your understanding with a quiz — without sending any data to the cloud.

```text
Page → Extract → Summarise → Ask → Quiz
```

## Why this project exists

Reading on the web is full of distraction.

You open an article, a paper, or a long thread, and by the time you reach the end you are not always sure what the key point was, what you should do with it, or whether you actually understood it. There is no quick way to get a different angle on the same content, no way to ask a question without switching tabs, and nothing to help you check whether anything stuck.

Saar AI is a practical response to that problem: sit alongside the page you are already reading, offer the content in the format that suits your goal, let you ask questions without leaving, and give you a way to verify your understanding before moving on.

The name *Saar* means essence or substance. That is the goal — extract only what is worth keeping.

## What it does

- 📖 Reads the active browser tab and extracts its text content
- ✂️ Summarises the page in multiple modes — highlights, TL;DR, abstract, Q&A, and more
- 💬 Answers your questions about the page in a persistent chat session
- 🧪 Generates a multiple-choice quiz to test your comprehension
- 🔒 Runs entirely on-device using Chrome's built-in AI — no data leaves your machine
- ⚡ Streams responses in real time so you are never waiting at a blank screen
- 💾 Caches summaries per page so switching modes is instant on revisit

## Built for

- Researchers and students reading long-form content
- Developers reviewing documentation or technical articles
- Anyone who wants to read less and understand more
- Privacy-conscious users who do not want content sent to external APIs

## Why it stands out

This project combines several real patterns in one small, focused tool:

- On-device AI using Chrome's `Summarizer` and `LanguageModel` APIs — no paid API key, no server
- Multiple summary formats driven by a single mode configuration, making it easy to extend
- A structured quiz engine that chunks the page, tracks coverage, and adapts difficulty
- A stateful chat session that keeps page context across the full conversation
- Session-scoped caching so generated summaries survive tab switches without re-running the model
- Built as a Chrome Manifest V3 extension with a React side panel

It is not just a wrapper around an LLM prompt. It is a structured reading tool with real UX decisions baked in.

## Architecture

### Feature overview

| Feature | What it does |
|---|---|
| Read | Summarises the page in the selected mode, streams the result, and caches it for the session |
| Ask | Opens a grounded chat session scoped to the page — the model cannot make things up that are not in the content |
| Quiz | Chunks the page into parts, generates structured MCQ questions via constrained output, and scores your answers |

### Summary modes

| Mode | Engine | Description |
|---|---|---|
| Highlights | Summarizer API | Key points, important facts, and notable insights |
| TL;DR | Summarizer API | The shortest possible summary of what the page is saying |
| Abstract | LanguageModel API | Structured overview: purpose, approach, key findings, conclusion |
| Limitations | LanguageModel API | Gaps, caveats, and what the source does not establish |
| Actions & Takeaways | LanguageModel API | Concrete next steps a reader can take from the content |
| Q&A | LanguageModel API | The most important questions about the content, answered |
| Glossary | LanguageModel API | Key technical or unfamiliar terms with plain definitions |
| Data Snapshot | LanguageModel API | Numbers, metrics, and statistics extracted as a visual chart |

### Component structure

```text
src/
├── components/
│   ├── Header.jsx       # Status indicator and branding
│   ├── Banner.jsx       # Error and progress messages
│   ├── Tabs.jsx         # Read / Ask / Quiz tab navigation
│   ├── ReadView.jsx     # Summary mode selector and output
│   ├── AskView.jsx      # Chat interface with streaming responses
│   └── QuizView.jsx     # Quiz setup, question flow, and scoring
├── constants/
│   └── modes.js         # Mode definitions and quiz configuration
├── hooks/
│   └── usePageContent.js # Page extraction and refresh logic
├── services/
│   ├── ai.js            # Summarizer and LanguageModel wrappers
│   └── chrome.js        # Session storage helpers
└── utils/               # Rendering, quiz logic, and prompt helpers
```

## On-device by design

Saar AI is intentionally built without any external API calls:

- Chrome's built-in `Summarizer` API
- Chrome's built-in `LanguageModel` API
- React for the side panel UI
- Vite for the build pipeline
- Manifest V3 service worker for extension lifecycle

No API key. No server. No data sent anywhere.

## Example workflow

```text
You open a research paper
      ↓
Saar AI extracts the page text
      ↓
You pick "Highlights" — key points stream in
      ↓
You switch to "Limitations" — gaps and caveats appear instantly from cache
      ↓
You ask "What did the study control for?" in the Ask tab
      ↓
You take a Medium-difficulty quiz and score 4 out of 5
```

## Getting started

### Prerequisites

- [Chrome Canary](https://www.google.com/chrome/canary/) (recommended) or Chrome 138+ on supported hardware
- Node.js 18+
- [pnpm](https://pnpm.io) for dependency management

> **Note:** Chrome's built-in AI APIs are powered by Gemini Nano and require compatible hardware (22 GB+ disk space, 4 GB+ VRAM). Availability on stable Chrome varies by region and device. [Chrome Canary](https://www.google.com/chrome/canary/) is the most reliable way to access these APIs regardless of region.

### Enable on-device AI in Chrome

Open Chrome (or Chrome Canary) and enable the following flags:

```text
chrome://flags/#optimization-guide-on-device-model   → set to Enabled BypassPerfRequirement
chrome://flags/#prompt-api-for-gemini-nano           → set to Enabled
chrome://flags/#summarization-api-for-gemini-nano    → set to Enabled
```

Relaunch Chrome after changing the flags. The first time you generate a summary, Chrome will download the Gemini Nano model in the background — this is a one-time setup.

For full setup instructions and hardware requirements, refer to the official documentation:

- [Chrome built-in AI overview](https://developer.chrome.com/docs/ai/built-in)
- [Prompt API for extensions](https://developer.chrome.com/docs/extensions/ai/prompt-api)
- [Summarization API](https://developer.chrome.com/docs/ai/summarizer-api)

### Installation

```bash
git clone https://github.com/deepak-terse/saar-ai
cd saar-ai
pnpm install
```

### Build the extension

```bash
pnpm build
```

This outputs the extension to the `dist/` directory.

### Load into Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `dist/` folder
4. Navigate to any web page and click the Saar AI icon to open the side panel

### Development

```bash
pnpm dev
```

For extension development, rebuild after changes and reload the extension in `chrome://extensions`.

## Why it matters

The goal is not to replace reading. It is to make reading more intentional.

Saar AI is an attempt to reduce the friction between opening a page and actually understanding it — by giving you the right summary format for your goal, a way to resolve doubts without leaving the page, and a lightweight check on whether you have genuinely absorbed what you read.

## Roadmap

- Highlight and annotate key passages directly on the page
- Export summaries and quiz results to Markdown or clipboard
- Support for PDF documents opened in Chrome
- Persistent history of summaries across sessions
- Per-site reading preferences and mode defaults
- Keyboard shortcuts for all core actions

## Contributing

Contributions are welcome.

This project is a focused, end-to-end reading tool built on Chrome's on-device AI APIs, with opportunities in:

- new summary modes and prompt design
- quiz difficulty calibration and coverage tracking
- page content extraction for complex layouts
- accessibility and keyboard navigation
- support for additional content types

If you are interested in improving the reading experience, open an issue or submit a pull request.

## License

This project is open source and intended for learning, experimentation, and personal productivity.

---

Built to make reading more focused, not just faster.
