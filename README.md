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
You open an article, a paper, or a long thread with the intention of learning something. But by the time you reach the end, it is not always clear what the key point was, what you should take away from it, or whether you actually understood it.

The problem is not a lack of information. It is the friction around consuming it.

When something is unclear, you have to leave the page to find an explanation. When you want a different perspective, you have to search for one. When you finish reading, there is rarely an easy way to tell whether you actually absorbed anything.

The result is that reading can become passive: you spend time consuming content without necessarily turning it into understanding.

## The Solution

The goal is not to replace reading. It is to make reading more intentional.
Saar AI is built around the idea that understanding should happen where reading happens — without breaking the flow.

It sits alongside the page you are already reading and gives you different ways to engage with the same content depending on what you need: get the essence, explore a different perspective, resolve a doubt, or test whether you actually understood what you read.

The name Saar means essence or substance. That captures the core idea: **extract what is worth keeping, then help you make it stick.**

## What it does

- 📖 Reads the active browser tab and extracts its content
- ✂️ Summarises pages in multiple modes — Highlights, TL;DR, Abstract, Q&A, and more
- 💬 Answers questions about the page in a persistent, page-grounded chat
- 🧪 Quizzes you with multiple-choice questions to test comprehension
- 📊 Presents rich content including tables, diagrams, and mathematical notation
- 🔒 Runs entirely on-device using Chrome's built-in AI — no API key or server required
- ⚡ Streams responses in real time
- 💾 Caches results per page so revisiting and switching modes is instant

## Built for

- Researchers and students reading long-form content
- Developers reviewing documentation or technical articles
- Anyone who wants to read less and understand more
- Privacy-conscious users who do not want content sent to external APIs

## Engineering Highlights

- On-device AI — Chrome's Summarizer + LanguageModel APIs; no backend or API key
- Resilient extraction — Readability with a custom DOM fallback and content cleanup pipeline
- Context-aware generation — Content classification drives category-specific AI behavior
- Structured AI output — Constrained JSON schemas with runtime validation for quizzes
- Stateful AI sessions — Page-grounded chat with context-window monitoring and overflow handling
- Three-tier storage — Session, local, and IndexedDB unified behind a single storage layer
- Defensive rendering — Sanitizes and repairs AI-generated Markdown, Mermaid, and tables
- Streaming UX — Incremental AI responses with partial rendering
- Configuration-driven features — Summary modes and prompt behavior defined through reusable configuration
- MV3 architecture — React side panel with clear separation of UI, AI, storage, and content services

## Tech stack

| Layer | Technology |
|---|---|
| AI | Chrome Summarizer API, Chrome LanguageModel API (Gemini Nano) |
| Content extraction | [@mozilla/readability](https://github.com/mozilla/readability) + custom fallback |
| Rendering | react-markdown, remark-gfm, remark-math, rehype-katex, Mermaid |
| Storage | Three-tier: session (chrome.storage.session), local (chrome.storage.local), persistent (IndexedDB) |
| UI | React 19, Vite, Manifest V3 side panel |


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

## Documentation

| Document | What it covers |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, component structure, data flow, and storage model |
| [Implementation](docs/IMPLEMENTATION.md) | Feature-level flows for Read, Ask, Quiz, and content extraction |

## License

MIT — open source for learning, experimentation, and personal productivity.

---

Built to make reading more focused, not just faster.
