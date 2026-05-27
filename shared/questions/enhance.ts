import type { Question } from "./types";

/**
 * Build an enhanced prompt by appending answered clarifying questions
 * as additional context.
 *
 * Only questions with non-empty answers are included.
 * Unanswered questions are omitted entirely.
 */
export function buildEnhancedPrompt(
  original: string,
  questions: Question[],
  answers: Record<string, string>
): string {
  const answeredQuestions = questions.filter((q) => {
    const answer = answers[q.id];
    return answer && answer.trim().length > 0;
  });

  if (answeredQuestions.length === 0) {
    return original;
  }

  const contextLines: string[] = [];
  contextLines.push("");
  contextLines.push("[Additional context from clarifying questions:]");

  for (const q of answeredQuestions) {
    const answer = answers[q.id]!;
    contextLines.push(`Q: ${q.question}`);
    contextLines.push(`A: ${answer}`);
  }

  return original + "\n" + contextLines.join("\n");
}
