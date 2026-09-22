import { useEffect, useId, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import mermaid from "mermaid";
import { sanitizeMarkdown } from "../utils/sanitizeMarkdown";

/* Initialise Mermaid once — deterministic IDs, no auto-run. */
mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    primaryColor: "#f1ddc9",
    primaryTextColor: "#23211d",
    primaryBorderColor: "#c16e2f",
    lineColor: "#6b6459",
    secondaryColor: "#dfe6e0",
    tertiaryColor: "#efebe2",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
});

/**
 * Renders a single Mermaid diagram from its source string.
 * Validates the diagram with mermaid.parse() before rendering
 * to prevent "Syntax error in text" messages from partial or
 * malformed definitions.
 */
const MermaidChart = ({ chart }) => {
  const containerRef = useRef(null);
  const uid = useId().replace(/:/g, "_");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        // Validate first — avoids orphan SVGs on parse failure
        await mermaid.parse(chart);
        const { svg } = await mermaid.render(`mermaid${uid}`, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Chart render failed");
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, uid]);

  if (error) {
    return <pre className="mermaid-error">{chart}</pre>;
  }

  return <div className="mermaid-container" ref={containerRef} />;
};

/**
 * Check if a mermaid code string looks like a complete diagram.
 * During streaming the closing fence hasn't arrived yet, so the
 * raw source will be cut off mid-definition. We do a lightweight
 * heuristic: the source must contain at least one newline and end
 * with a recognisable diagram token (word char, digit, quote, or
 * bracket) rather than trailing on a keyword line.
 */
const looksCompleteMermaid = (src) => {
  const trimmed = src.trim();
  // Must have at least a diagram type keyword and one data line
  if (!trimmed.includes("\n")) return false;
  // Very short sources are almost certainly still streaming
  if (trimmed.length < 20) return false;
  return true;
};

/**
 * Custom renderer map for react-markdown.
 * Intercepts fenced code blocks with language "mermaid" and routes
 * them to <MermaidChart>; everything else falls through to defaults.
 */
const markdownComponents = {
  code({ className, children, ...rest }) {
    const language = /language-(\w+)/.exec(className || "")?.[1];

    if (language === "mermaid") {
      const src = String(children).trim();
      if (!looksCompleteMermaid(src)) {
        // Still streaming — show a placeholder instead of a parse error
        return (
          <div className="mermaid-container mermaid-loading">
            <span className="mermaid-loading-text">Rendering chart…</span>
          </div>
        );
      }
      return <MermaidChart chart={src} />;
    }

    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  },
};

/**
 * Renders an AI response as rich Markdown with Mermaid chart support
 * and GFM table rendering. Sanitises the AI output first to fix
 * common formatting issues from on-device models.
 */
export const MarkdownOutput = ({ text }) => {
  const cleaned = useMemo(() => sanitizeMarkdown(text), [text]);

  return (
    <div className="markdown-output">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  );
};
