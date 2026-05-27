import type { Question } from "./types";

/**
 * Parse the LLM's text response into an array of Question objects.
 *
 * Handles:
 * - Markdown code blocks (\`\`\`json ... \`\`\`)
 * - Raw JSON objects
 * - Partial/malformed responses (returns empty array on failure)
 */
export function parseQuestionsResponse(text: string): Question[] {
  const trimmed = text.trim();

  if (!trimmed) {
    return [];
  }

  try {
    // 1. Prefer a markdown code block
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = codeBlockMatch ? codeBlockMatch[1]!.trim() : trimmed;

    // 2. Try to find a JSON object with a "questions" key
    const objMatch = jsonStr.match(/\{[\s\S]*"questions"[\s\S]*\}/);
    if (!objMatch) {
      return [];
    }

    const parsed = JSON.parse(objMatch[0]);

    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.questions)) {
      return [];
    }

    return parsed.questions.filter(isValidQuestion);
  } catch {
    return [];
  }
}

function isValidQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") {
    return false;
  }

  const q = value as Record<string, unknown>;

  if (typeof q.id !== "string" || !q.id.trim()) {
    return false;
  }
  if (typeof q.question !== "string" || !q.question.trim()) {
    return false;
  }

  const validTypes = ["text", "select", "multi"];
  if (!validTypes.includes(q.type as string)) {
    return false;
  }

  // "select" and "multi" must have at least 2 options
  if (q.type === "select" || q.type === "multi") {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return false;
    }
    if (q.options.some((o: unknown) => typeof o !== "string")) {
      return false;
    }
  }

  return true;
}
