/**
 * Post-processes AI output to fix common formatting issues from on-device
 * models that don't reliably follow strict markdown/mermaid formatting rules.
 *
 * Handles:
 * 1. Single-line tables → proper multi-line markdown tables
 * 2. Bare mermaid diagrams (no fences) → wrapped in ```mermaid fences
 * 3. Common mermaid syntax fixups (missing commas in arrays, etc.)
 */

/* ------------------------------------------------------------------ */
/*  Table repair                                                      */
/* ------------------------------------------------------------------ */

/**
 * Detect a single-line markdown table and split it into proper rows.
 *
 * The AI sometimes outputs a table like:
 *   | Metric | Value | Context | |---|---|---| | Users | 1M | up 30 pct |
 * or even:
 *   | Metric | Value | Context | |---| | Users | 25000000000 | | Cited by paper | 25000 | |
 *
 * This needs to become:
 *   | Metric | Value | Context |
 *   |---|---|---|
 *   | Users | 1M | up 30 pct |
 */
function repairTables(text) {
  const lines = text.split("\n");
  const result = [];

  for (const line of lines) {
    // Only process lines that look like a single-line table
    // (contain a separator pattern like |---| somewhere in the middle)
    const sepMatch = line.match(/\|\s*[-:]+\s*(?:\|\s*[-:]*\s*)*\|/);

    if (!sepMatch || line.trim().replace(/[\s\-:|]/g, "") === "") {
      // Not a table line, or is a pure separator row already on its own line
      result.push(line);
      continue;
    }

    // Check: is there content both BEFORE and AFTER the separator?
    const sepStart = sepMatch.index;
    const sepEnd = sepStart + sepMatch[0].length;
    const beforeSep = line.slice(0, sepStart).trim();
    const afterSep = line.slice(sepEnd).trim();

    // If there's no content on both sides, it's not a single-line table
    if (!beforeSep || !afterSep) {
      result.push(line);
      continue;
    }

    // We have: header | separator | data on one line
    // Parse the header to get the column count
    const headerCells = beforeSep.split("|").map(c => c.trim()).filter(c => c !== "");
    const colCount = headerCells.length;

    if (colCount === 0) {
      result.push(line);
      continue;
    }

    // Build proper header row
    const headerRow = "| " + headerCells.join(" | ") + " |";

    // Build proper separator row matching column count
    const sepRow = "|" + " --- |".repeat(colCount);

    // Parse all data cells from the remaining part.
    // The data part looks like: | Users | 25000000000 | | Cited by paper | 25000 | |
    // Split on | but KEEP empty cells — consecutive || marks a row boundary.
    const rawCells = afterSep.split("|").map(c => c.trim());

    // Remove leading/trailing empties from the split (artifact of leading/trailing |)
    if (rawCells.length > 0 && rawCells[0] === "") rawCells.shift();
    if (rawCells.length > 0 && rawCells[rawCells.length - 1] === "") rawCells.pop();

    // Group cells into rows. An empty cell between two content cells marks
    // a row boundary (it's the trailing | of one row + leading | of next row).
    const dataRows = [];
    let currentRow = [];
    for (const cell of rawCells) {
      if (cell === "" && currentRow.length > 0) {
        // Row boundary — flush current row
        while (currentRow.length < colCount) currentRow.push("");
        dataRows.push("| " + currentRow.slice(0, colCount).join(" | ") + " |");
        currentRow = [];
      } else if (cell !== "") {
        currentRow.push(cell);
        if (currentRow.length === colCount) {
          dataRows.push("| " + currentRow.join(" | ") + " |");
          currentRow = [];
        }
      }
    }
    // Flush any remaining cells
    if (currentRow.length > 0) {
      while (currentRow.length < colCount) currentRow.push("");
      dataRows.push("| " + currentRow.slice(0, colCount).join(" | ") + " |");
    }

    result.push(headerRow);
    result.push(sepRow);
    result.push(...dataRows);
  }

  return result.join("\n");
}

/**
 * Also handle the case where each row IS on its own line but the separator
 * row has the wrong column count (e.g., |---| instead of |---|---|---|).
 */
function repairSeparatorRow(text) {
  const lines = text.split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Is this a separator row? (contains only |, -, :, and spaces)
    if (/^\|[\s\-:|]+\|$/.test(line.trim())) {
      // Look at the header row above
      const headerLine = i > 0 ? lines[i - 1] : null;
      if (headerLine && headerLine.trim().startsWith("|")) {
        const headerCols = headerLine.split("|").filter(c => c.trim() !== "").length;
        const sepCols = line.split("|").filter(c => c.trim() !== "").length;

        if (sepCols !== headerCols && headerCols > 0) {
          // Fix separator row to match header column count
          result.push("|" + " --- |".repeat(headerCols));
          continue;
        }
      }
    }
    result.push(line);
  }

  return result.join("\n");
}


/* ------------------------------------------------------------------ */
/*  Mermaid repair                                                    */
/* ------------------------------------------------------------------ */

/** Known mermaid diagram type keywords that can start a block. */
const MERMAID_TYPES = [
  "pie",
  "xychart-beta",
  "xychart",
  "flowchart",
  "graph",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "gantt",
  "journey",
  "gitGraph",
  "mindmap",
  "timeline",
  "quadrantChart",
  "sankey-beta",
  "block-beta",
];

const MERMAID_START_RE = new RegExp(
  `^(${MERMAID_TYPES.join("|")})(?:\\s|$)`, "m"
);

/**
 * Wrap bare mermaid diagram blocks in ```mermaid fences.
 *
 * Detects blocks that start with a known diagram keyword and are NOT
 * already inside a fenced code block.
 */
function wrapBareMermaidBlocks(text) {
  // If the text already contains ```mermaid, assume fences are present
  if (/```mermaid/i.test(text)) return text;

  // Check if there's a bare mermaid diagram type keyword
  if (!MERMAID_START_RE.test(text)) return text;

  const lines = text.split("\n");
  const result = [];
  let inMermaid = false;
  let mermaidLines = [];

  const flushMermaid = () => {
    // Strip trailing blank lines
    while (mermaidLines.length > 0 && mermaidLines[mermaidLines.length - 1].trim() === "") {
      mermaidLines.pop();
    }
    if (mermaidLines.length > 0) {
      result.push("```mermaid");
      result.push(...mermaidLines);
      result.push("```");
      mermaidLines = [];
    }
    inMermaid = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inMermaid && MERMAID_START_RE.test(trimmed)) {
      // Start of a mermaid block
      inMermaid = true;
      mermaidLines.push(line);
    } else if (inMermaid) {
      // Continue mermaid block if the line looks like diagram content
      // (indented, or has diagram-specific syntax, or is non-empty continuation)
      if (
        trimmed === "" ||
        /^\s/.test(line) ||                    // indented
        /^(title|x-axis|y-axis|bar|line|"|\s)/.test(trimmed)  // diagram keywords
      ) {
        mermaidLines.push(line);
      } else {
        // End of mermaid block — this line is something else
        flushMermaid();
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  // Flush any remaining mermaid block
  flushMermaid();

  return result.join("\n");
}

/**
 * Fix common mermaid syntax issues inside fenced blocks:
 * - Missing commas in array values: bar [10 20 30] → bar [10, 20, 30]
 * - Spaces in x-axis arrays: x-axis [2021 2022] → x-axis [2021, 2022]
 */
function fixMermaidSyntax(text) {
  return text.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (match, body) => {
      let fixed = body;

      // Fix arrays with space-separated values (no commas)
      // e.g., bar [10 20 30] → bar [10, 20, 30]
      // e.g., x-axis [2021 2022 2023] → x-axis [2021, 2022, 2023]
      fixed = fixed.replace(
        /\[([^\]]+)\]/g,
        (_m, inner) => {
          // Only fix if there are no commas but multiple space-separated tokens
          if (!inner.includes(",") && inner.trim().split(/\s+/).length > 1) {
            const items = inner.trim().split(/\s+/);
            return "[" + items.join(", ") + "]";
          }
          return "[" + inner + "]";
        }
      );

      return "```mermaid\n" + fixed + "```";
    }
  );
}


/* ------------------------------------------------------------------ */
/*  Main sanitizer                                                    */
/* ------------------------------------------------------------------ */

/**
 * Sanitise AI-generated markdown before rendering.
 * Applies table repair and mermaid repair in sequence.
 */
export function sanitizeMarkdown(text) {
  if (!text) return text;

  let result = text;

  // 1. Fix single-line tables
  result = repairTables(result);

  // 2. Fix separator rows with wrong column count
  result = repairSeparatorRow(result);

  // 3. Wrap bare mermaid diagrams in fences
  result = wrapBareMermaidBlocks(result);

  // 4. Fix common mermaid syntax issues
  result = fixMermaidSyntax(result);

  return result;
}
