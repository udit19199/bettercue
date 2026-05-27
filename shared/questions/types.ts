/**
 * Input type for a clarifying question.
 * - "text": free-form text input (textarea)
 * - "select": single choice from options (dropdown)
 * - "multi": multiple choice from options (checkboxes)
 */
export type QuestionType = "text" | "select" | "multi";

/**
 * A single clarifying question returned by the LLM.
 */
export type Question = {
  /** Unique identifier for this question (e.g. "audience", "tone"). */
  id: string;
  /** The question text displayed to the user. */
  question: string;
  /** How the UI should render this question. */
  type: QuestionType;
  /** Options for "select" and "multi" types. */
  options?: string[];
  /** Whether the user is required to answer. */
  required?: boolean;
};
