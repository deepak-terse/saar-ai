import { QUIZ_DIFFICULTY_INSTRUCTIONS } from "../constants/modes";

export const createInitialQuiz = (previousDifficulty = "medium") => {
  return {
    difficulty: previousDifficulty,
    status: "setup",
    parts: [],
    coverage: [],
    batch: null,
    batchIndex: 0,
    qIndex: 0,
    selected: [],
    answered: false,
    lastAnswerCorrect: null,
    batchScore: { correct: 0, total: 0 },
    totalScore: { correct: 0, total: 0 },
    lastResult: null,
    errorMessage: "",
  };
}

export const chunkPageIntoParts = (text, count) => {
  const clean = text.trim();
  if (!clean) return [];

  const target = Math.ceil(clean.length / count);
  const parts = [];
  let cursor = 0;

  for (let i = 0; i < count && cursor < clean.length; i += 1) {
    let end = Math.min(cursor + target, clean.length);

    if (end < clean.length) {
      const nextBreak = clean.indexOf("\n", end);
      const nextPeriod = clean.indexOf(". ", end);
      const candidates = [nextBreak, nextPeriod].filter(
        (position) => position !== -1 && position - end < 300
      );
      if (candidates.length) end = Math.min(...candidates) + 1;
    }

    parts.push(clean.slice(cursor, end).trim());
    cursor = end;
  }

  if (cursor < clean.length && parts.length) {
    parts[parts.length - 1] += ` ${clean.slice(cursor).trim()}`;
  }

  return parts.filter(Boolean);
}

export const buildQuizSchema = (partCount) => {
  return {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: partCount,
        maxItems: partCount,
        items: {
          type: "object",
          properties: {
            partIndex: { type: "integer" },
            type: { type: "string", enum: ["single", "multiple", "true-false"] },
            question: { type: "string" },
            options: {
              type: "array",
              minItems: 2,
              maxItems: 5,
              items: { type: "string" },
            },
            correctIndexes: {
              type: "array",
              minItems: 1,
              items: { type: "integer" },
            },
            explanation: { type: "string" },
          },
          required: [
            "partIndex",
            "type",
            "question",
            "options",
            "correctIndexes",
            "explanation",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  };
}

export const buildQuizPrompt = (quiz) => {
  const partsBlock = quiz.parts
    .map((text, index) => {
      const coverage = quiz.coverage[index];
      let note = "Not yet covered.";

      if (coverage?.askedTopics.length) {
        note = `Already asked about: ${coverage.askedTopics.join("; ")}. ${coverage.lastCorrect
          ? "Answered correctly last time — ask about a DIFFERENT detail from this part now, not the same topic again."
          : "Answered incorrectly last time — you may revisit the same concept, phrased more clearly, to help it stick."
          }`;
      }

      return `Part ${index + 1} (${note}):\n"""\n${text}\n"""`;
    })
    .join("\n\n");

  return `You are writing a reading-comprehension quiz based on a web page's content, split into ${quiz.parts.length} parts below.

Write exactly ${quiz.parts.length} questions, one per part, in the same order as the parts (partIndex 0 for Part 1, 1 for Part 2, and so on). Each question must be answerable using only its own part.

Difficulty: ${QUIZ_DIFFICULTY_INSTRUCTIONS[quiz.difficulty]}

Rules for every question:
- "type" is "single" (one correct option), "multiple" (two or more correct options), or "true-false" (exactly two options, "True" and "False").
- "options" has 2-5 short answer choices, no letter or number prefixes.
- "correctIndexes" lists the zero-based index/indexes of the correct option(s).
- "explanation" is one or two sentences on why the correct answer is right.
- Base every question only on its part's content — never invent facts.

${partsBlock}`;
}

export const validateQuizBatch = (raw, partCount) => {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!parsed || !Array.isArray(parsed.questions)) return [];

  const valid = [];

  for (const question of parsed.questions) {
    if (!question || typeof question.question !== "string" || !Array.isArray(question.options)) {
      continue;
    }

    const options = question.options
      .filter((option) => typeof option === "string" && option.trim())
      .slice(0, 5);

    if (options.length < 2) continue;

    const correctIndexes = Array.isArray(question.correctIndexes)
      ? [...new Set(question.correctIndexes)].filter(
        (index) =>
          Number.isInteger(index) && index >= 0 && index < options.length
      )
      : [];

    if (!correctIndexes.length) continue;

    const type = ["single", "multiple", "true-false"].includes(question.type)
      ? question.type
      : "single";

    const partIndex =
      Number.isInteger(question.partIndex) &&
        question.partIndex >= 0 &&
        question.partIndex < partCount
        ? question.partIndex
        : valid.length % partCount;

    valid.push({
      type,
      question: question.question.trim(),
      options,
      correctIndexes,
      explanation:
        typeof question.explanation === "string"
          ? question.explanation.trim()
          : "",
      partIndex,
    });
  }

  return valid;
}

export const areSameIndexes = (a, b) => {
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}