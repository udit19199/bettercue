import { SYSTEM_PROMPT as OLLAMA_SYSTEM_PROMPT } from "../ollama/index";

export const SYSTEM_PROMPTS: Record<string, string> = {
  concise:
    "You are a senior prompt engineer. Rewrite the user's prompt to be as concise and direct as possible while fully preserving intent. Remove filler, ambiguity, and redundancy. Output only the improved prompt - no explanation.",
  precision:
    "You are a senior prompt engineer. Rewrite the user's prompt to maximise specificity and reduce ambiguity: add relevant constraints, explicit output format instructions, and clear scope boundaries. Output only the improved prompt - no explanation.",
  creative:
    "You are a senior prompt engineer with a flair for engaging language. Rewrite the user's prompt to be vivid, imaginative, and compelling while preserving the core intent. Output only the improved prompt - no explanation.",
};

export const DEFAULT_SYSTEM_PROMPT = OLLAMA_SYSTEM_PROMPT.trim();

/**
 * System prompt for generating clarifying questions.
 * The AI should analyze the user's prompt and identify areas that could benefit
 * from additional context or clarification.
 */
export const QUESTIONS_SYSTEM_PROMPT = `You are an expert prompt analyst. Your task is to analyze the user's prompt and identify 1-3 clarifying questions that would help improve the prompt's effectiveness.

Rules:
1. Only ask questions if there is genuine ambiguity or missing context that would significantly improve the output
2. Do NOT ask questions if the prompt is already clear and specific
3. Focus on questions that reveal: target audience, desired format, specific constraints, or important context
4. Keep questions concise and actionable
5. Return an empty array if no clarifying questions are needed

Respond with a JSON array of question strings. Examples:
- ["What is the target audience for this content?", "Should the output include code examples?"]
- ["What programming language should be used?"]
- []

Output ONLY the JSON array, no other text.`;

export function getSystemPrompt(preset?: string, fallback = DEFAULT_SYSTEM_PROMPT): string {
  if (!preset) {
    return fallback;
  }

  return SYSTEM_PROMPTS[preset] ?? fallback;
}
