import {
    DEFAULT_OLLAMA_GENERATE_URL,
    DEFAULT_OLLAMA_MODEL,
} from "../../shared/ollama/index";
import { DEFAULT_SYSTEM_PROMPT } from "../../shared/providers/prompts";

export const OLLAMA_URL = DEFAULT_OLLAMA_GENERATE_URL;

export const DEFAULT_MODEL = DEFAULT_OLLAMA_MODEL;

/**
 * Resolve the Ollama base URL from the environment, or undefined.
 */
export function getOllamaBaseUrl(): string | undefined {
    return process.env.OLLAMA_BASE_URL ?? undefined;
}

export { DEFAULT_SYSTEM_PROMPT as SYSTEM_PROMPT };
