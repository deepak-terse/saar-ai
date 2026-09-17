import { Readability } from "@mozilla/readability";

(() => {
  const MAX_CHARS = 12000;
  const MIN_TEXT_LENGTH = 200;

  const REMOVE_SECTION_HEADINGS = new Set([
    "see also",
    "references",
    "reference",
    "bibliography",
    "works cited",
    "citations",
    "citation",
    "external links",
    "further reading",
    "notes",
    "footnotes",
    "endnotes",
    "sources",
    "recommended reading",
    "related articles",
    "related content",
    "related posts",
    "related stories",
    "related research",
    "recommended articles",
    "recommended posts",
    "you may also like",
    "you might also like",
    "more from",
    "more stories",
    "more articles",
    "read more",
    "continue reading",
    "comments",
    "commentary",
    "discussion",
    "discussions",
    "appendix",
    "appendices",
    "acknowledgements",
    "acknowledgments",
    "conflicts of interest",
    "supplementary material",
    "supplemental material",
    "supporting information",
  ]);

  const REMOVE_ELEMENT_PATTERNS = [
    /\bcomments?\b/i,
    /\bcomment[-_ ]?section\b/i,
    /\bcomment[-_ ]?list\b/i,
    /\brelated[-_ ]?(posts?|articles?|stories?|content|links?)\b/i,
    /\brecommended[-_ ]?(posts?|articles?|stories?|content)\b/i,
    /\bpopular[-_ ]?(posts?|articles?|stories?)\b/i,
    /\btrending[-_ ]?(posts?|articles?|stories?)\b/i,
    /\bmore[-_ ]?(posts?|articles?|stories?)\b/i,
    /\bnewsletter\b/i,
    /\bsubscription\b/i,
    /\bsubscribe\b/i,
    /\bsocial[-_ ]?(share|sharing|links?)\b/i,
    /\bshare[-_ ]?(buttons?|links?)\b/i,
    /\bsharing[-_ ]?(buttons?|links?)\b/i,
    /\bpromo(tion)?\b/i,
    /\badvertisement\b/i,
    /\bsponsored\b/i,
    /\bpaywall\b/i,
    /\bprint[-_ ]?(button|links?)\b/i,
    /\bcopy[-_ ]?link\b/i,
    /\btable[-_ ]?of[-_ ]?contents?\b/i,
    /\bpage[-_ ]?navigation\b/i,
    /\bpost[-_ ]?navigation\b/i,
    /\barticle[-_ ]?(footer|sidebar)\b/i,
    /\bentry[-_ ]?(footer|sidebar)\b/i,
  ];

  const FALLBACK_SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "NAV",
    "HEADER",
    "FOOTER",
    "ASIDE",
    "FORM",
    "SVG",
    "BUTTON",
    "TEMPLATE",
    "IFRAME",
    "DIALOG",
    "CANVAS",
    "VIDEO",
    "AUDIO",
    "OBJECT",
    "EMBED",
  ]);

  const SECTION_HEADING_SELECTOR = "h1,h2,h3,h4,h5,h6";

  const normalizeText = (value) => String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/[•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const normalizeHeading = (value) => normalizeText(value)
    .replace(/\s*:\s*$/, "")
    .trim();

  const getElementIdentifier = (element) => [
    element.id || "",
    element.className || "",
    element.getAttribute("role") || "",
    element.getAttribute("aria-label") || "",
    element.getAttribute("data-testid") || "",
  ].join(" ");

  const matchesRemovePattern = (element) => {
    const identifier = getElementIdentifier(element);
    return REMOVE_ELEMENT_PATTERNS.some((pattern) =>
      pattern.test(identifier)
    );
  };

  const removeHiddenElements = (root) => {
    if (!root || !root.querySelectorAll) {
      return;
    }

    root.querySelectorAll("*").forEach((element) => {
      if (element.getAttribute("aria-hidden") === "true" || element.hidden || element.hasAttribute("inert")) {
        element.remove();
        return;
      }

      try {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") element.remove();
      } catch {
        // Ignore style inspection failures.
      }
    });
  };

  const removeKnownNonContentElements = (root) => {
    if (!root || !root.querySelectorAll) return;

    root.querySelectorAll("*").forEach((element) => {
      if (matchesRemovePattern(element)) element.remove();
    });
  };

  const removeSectionStartingAtHeading = (heading) => {
    if (!heading) return;

    const headingLevel = Number(heading.tagName.slice(1));
    let node = heading.nextElementSibling;

    heading.remove();

    while (node) {
      const next = node.nextElementSibling;
      const isHeading = /^H[1-6]$/.test(node.tagName);

      if (isHeading) {
        const nextHeadingLevel = Number(node.tagName.slice(1));

        if (nextHeadingLevel <= headingLevel) {
          break;
        }
      }

      node.remove();
      node = next;
    }
  };

  const removeUnwantedSections = (html) => {
    const parsed = new DOMParser().parseFromString(html || "", "text/html");
    const root = parsed.body;

    if (!root) return "";
    const headings = [...root.querySelectorAll(SECTION_HEADING_SELECTOR)];

    for (const heading of headings) {
      if (!heading.isConnected) continue;
      const headingText = normalizeHeading(heading.textContent);
      if (REMOVE_SECTION_HEADINGS.has(headingText)) removeSectionStartingAtHeading(heading);
    }

    return root.innerHTML;
  };

  const removeSupplementaryElements = (html) => {
    const parsed = new DOMParser().parseFromString(html || "", "text/html");
    const root = parsed.body;

    if (!root) return "";

    removeHiddenElements(root);
    removeKnownNonContentElements(root);

    return root.innerHTML;
  };

  const cleanText = (html) => {
    const doc = new DOMParser().parseFromString(html || "", "text/html");

    return (doc.body?.innerText || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  };

  const cleanExtractedHtml = (html) => {
    const withoutSections = removeUnwantedSections(html);
    return removeSupplementaryElements(withoutSections);
  };

  const fallbackExtract = () => {
    const clone = document.body.cloneNode(true);

    clone.querySelectorAll("*").forEach((element) => {
      if (FALLBACK_SKIP_TAGS.has(element.tagName)) {
        element.remove();
        return;
      }

      if (matchesRemovePattern(element)) {
        element.remove();
        return;
      }

      try {
        const style = window.getComputedStyle(element);

        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse" ||
          element.getAttribute("aria-hidden") === "true"
        ) {
          element.remove();
        }
      } catch {
        // Ignore style inspection failures.
      }
    });

    const cleanedHtml = cleanExtractedHtml(clone.innerHTML);

    return cleanText(cleanedHtml);
  };

  const getMetaContent = (selector) => {
    return document.querySelector(selector)?.content?.trim() || "";
  };

  const extract = () => {
    let article = null;
    let text = "";
    let extractionMethod = "none";

    try {
      const documentClone = document.cloneNode(true);

      const reader = new Readability(documentClone, {
        charThreshold: 200,
        keepClasses: false,
      });

      article = reader.parse();
    } catch (error) {
      console.warn("Readability extraction failed:", error);
    }

    if (article?.content) {
      const cleanedHtml = cleanExtractedHtml(article.content);
      text = cleanText(cleanedHtml);
      extractionMethod = "readability";
    }

    if (text.length < MIN_TEXT_LENGTH) {
      text = fallbackExtract();
      extractionMethod = "fallback";
    }

    const truncated = text.length > MAX_CHARS;
    const finalText = truncated
      ? text.slice(0, MAX_CHARS).trim()
      : text;

    const words = finalText
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);

    return {
      ok: Boolean(finalText),

      title:
        article?.title ||
        getMetaContent("meta[property='og:title']") ||
        getMetaContent("meta[name='twitter:title']") ||
        document.title ||
        "",

      byline:
        article?.byline ||
        getMetaContent("meta[name='author']") ||
        getMetaContent("meta[property='article:author']") ||
        "",

      siteName:
        article?.siteName ||
        getMetaContent("meta[property='og:site_name']") ||
        location.hostname,

      excerpt:
        article?.excerpt ||
        getMetaContent("meta[name='description']") ||
        getMetaContent("meta[property='og:description']") ||
        getMetaContent("meta[name='twitter:description']") ||
        "",

      url: location.href,

      text: finalText,

      wordCount: words.length,

      truncated,

      extractionMethod,
    };
  };

  return extract();
})();