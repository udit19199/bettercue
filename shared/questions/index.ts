/**
 * Questions module — shared by CLI and extension.
 *
 * Provides types, parsing, system prompts, and helper functions for
 * the clarifying-questions flow.
 */
export { QUESTIONS_SYSTEM_PROMPT } from "./systemPrompt";
export { parseQuestionsResponse } from "./parse";
export { buildEnhancedPrompt } from "./enhance";
export type { Question, QuestionType } from "./types";
