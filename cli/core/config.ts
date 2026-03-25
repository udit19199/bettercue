import {
    DEFAULT_OLLAMA_GENERATE_URL,
    DEFAULT_OLLAMA_MODEL,
    SYSTEM_PROMPT,
} from "../../shared/ollama/index";

import { CORE_PROVIDERS } from "../../shared/providers/index.ts";
import type { CoreProviderId } from "../../shared/providers/index.ts";

export const OLLAMA_URL = DEFAULT_OLLAMA_GENERATE_URL;

export const DEFAULT_MODEL = DEFAULT_OLLAMA_MODEL;
export { SYSTEM_PROMPT };

export const DEFAULT_PROVIDER: CoreProviderId = "ollama";

export const DEFAULT_MODELS: Record<CoreProviderId, string> = {
    ollama: CORE_PROVIDERS.ollama.defaultModel || DEFAULT_OLLAMA_MODEL,
    openai: CORE_PROVIDERS.openai.defaultModel,
    anthropic: CORE_PROVIDERS.anthropic.defaultModel,
    google: CORE_PROVIDERS.google.defaultModel,
};

export const PROVIDER_API_KEY_ENV: Record<CoreProviderId, string | null> = {
    ollama: null,
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_API_KEY",
};
