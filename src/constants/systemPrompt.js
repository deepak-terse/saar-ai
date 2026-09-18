import { CONTENT_CATEGORIES } from "./modes";

/**
 * Common instructions prepended to every AI prompt.
 * Keeps all modes consistent and forces clean Markdown output.
 */
export const COMMON_SYSTEM_INSTRUCTIONS = `You are a reading assistant that analyzes web page content.
- Use ONLY information present on the page; never infer or fabricate facts.
- Be concise and direct.
- Format your entire response as clean, standards-compliant Markdown.
  - For charts or graphs, use fenced Mermaid code blocks (\`\`\`mermaid ... \`\`\`). The opening fence must start at column 0 with no leading spaces.
  - Do NOT use raw HTML tags.
  - Do NOT wrap the response in a top-level code fence.
  - Follow the formatting instructions for each mode exactly — they override any general formatting assumptions.`;

/**
 * Build the page-context block that is appended to every prompt.
 * Returns a string with category hint, page metadata, and content.
 */
export const buildPromptContext = ({ page, category }) => {
  const categoryLine =
    category && CONTENT_CATEGORIES[category]
      ? `\nContent type: This content has been classified as: ${CONTENT_CATEGORIES[category].types}. Tailor your analysis to this content type.\n`
      : "";

  return `${categoryLine}
Page title: ${page.title}
Page URL: ${page.url}

Page content:
"""
${page.text}
"""`;
};
