<div align="center">
<img src="./assets/icon128.png" alt="Saar AI Icon" width="100" height="100">
<h1> Saar AI</h1>

[![License](https://img.shields.io/badge/License-MIT-blue.svg?logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![Tech](https://img.shields.io/badge/Tech-Chrome%20Extension-yellow?style=flat-square&logo=googlechrome&logoColor=black)](https://developer.chrome.com/docs/extensions/)
[![AI: On-Device LLM](https://img.shields.io/badge/AI-On--Device%20LLM-7C3AED.svg?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/ai/)
</div>

> A Chrome extension that turns any web page into a focused reading experience — entirely on-device.

Saar AI sits in Chrome's side panel. It reads the current page, classifies the content type, generates summaries in eight formats, answers questions grounded in the page, and tests your understanding with adaptive quizzes. No data leaves your machine.

```text
Page → Extract → Classify → Summarise → Ask → Quiz
```

## The Problem

Reading on the web is full of distraction.

You open an article, a paper, or a long thread, and by the time you reach the end you are not always sure what the key point was, what you should do with it, or whether you actually understood it. There is no quick way to get a different angle on the same content, no way to ask a question without switching tabs, and nothing to help you check whether anything stuck.

Saar AI is a practical response to that problem: sit alongside the page you are already reading, offer the content in the format that suits your goal, let you ask questions without leaving, and give you a way to verify your understanding before moving on.

The name *Saar* means essence or substance. That is the goal — extract only what is worth keeping.

## The Idea

The goal is not to replace reading. It is to make reading more intentional.

Saar AI is an attempt to reduce the friction between opening a page and actually understanding it — by giving you the right summary format for your goal, a way to resolve doubts without leaving the page, and a lightweight check on whether you have genuinely absorbed what you read.

## What it does

- **Reads** the active tab and extracts content using [Readability](https://github.com/mozilla/readability) with a custom fallback
- **Classifies** the page — Article/Research, Blog/Opinion, or Story/Narrative — and adapts all prompts accordingly
- **Summarises** in 8 modes: Highlights, TL;DR, Abstract, Limitations, Actions & Takeaways, Q&A, Glossary, Data Snapshot
- **Answers** your questions in a persistent, page-grounded chat session with context-window monitoring
- **Quizzes** you with structured MCQs at Easy / Medium / Hard difficulty, with coverage tracking and explanations
- **Renders** rich output: Markdown, GFM tables, Mermaid charts, LaTeX math — with auto-repair for on-device model quirks
- **Tracks** reading efficiency: minutes saved per page, lifetime hours saved, pages condensed
- **Caches** everything per page so switching modes or revisiting is instant
- **Runs offline** — Chrome's built-in Gemini Nano, no API key, no server

## Built for

- Researchers and students reading long-form content
- Developers reviewing documentation or technical articles
- Anyone who wants to read less and understand more
- Privacy-conscious users who do not want content sent to external APIs

## Getting started

### Prerequisites

- [Chrome Canary](https://www.google.com/chrome/canary/) (recommended) or Chrome 138+
- Node.js 18+
- [pnpm](https://pnpm.io)

> **Note:** Chrome's built-in AI APIs are powered by Gemini Nano and require compatible hardware (22 GB+ disk space, 4 GB+ VRAM). Availability on stable Chrome varies by region and device. [Chrome Canary](https://www.google.com/chrome/canary/) is the most reliable way to access these APIs regardless of region.

### Enable on-device AI in Chrome

Open Chrome (or Chrome Canary) and enable the following flags:

```text
chrome://flags/#optimization-guide-on-device-model   → set to Enabled BypassPerfRequirement
chrome://flags/#prompt-api-for-gemini-nano           → set to Enabled
chrome://flags/#summarization-api-for-gemini-nano    → set to Enabled
```

Relaunch Chrome. The first summary triggers a one-time Gemini Nano model download.

For full setup instructions and hardware requirements, refer to the official documentation:

- [Chrome built-in AI overview](https://developer.chrome.com/docs/ai/built-in)
- [Prompt API for extensions](https://developer.chrome.com/docs/extensions/ai/prompt-api)
- [Summarization API](https://developer.chrome.com/docs/ai/summarizer-api)

### Install and run

```bash
git clone https://github.com/deepak-terse/saar-ai
cd saar-ai
pnpm install
pnpm build
```

1. Open `chrome://extensions` → enable **Developer mode**
2. Click **Load unpacked** → select the `dist/` folder
3. Navigate to any page → click the Saar AI icon

For development: `pnpm dev`, then rebuild and reload the extension after changes.

## Tech stack

| Layer | Technology |
|---|---|
| AI | Chrome Summarizer API, Chrome LanguageModel API (Gemini Nano) |
| Content extraction | [@mozilla/readability](https://github.com/mozilla/readability) + custom fallback |
| Rendering | react-markdown, remark-gfm, remark-math, rehype-katex, Mermaid |
| Storage | Three-tier: session (chrome.storage.session), local (chrome.storage.local), persistent (IndexedDB) |
| UI | React 19, Vite, Manifest V3 side panel |

## Documentation

| Document | What it covers |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, component structure, data flow, and storage model |
| [Implementation](docs/IMPLEMENTATION.md) | Feature-level flows for Read, Ask, Quiz, and content extraction |

## License

MIT — open source for learning, experimentation, and personal productivity.

---

Built to make reading more focused, not just faster.
