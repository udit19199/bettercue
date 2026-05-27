import type { CoreProviderId } from "./types";

export type ProviderMeta = {
  id: CoreProviderId;
  displayName: string;
  defaultModel: string;
  requiresApiKey: boolean;
  /** The environment variable name to read the API key from, or null if not applicable (e.g. Ollama). */
  apiKeyEnvVar: string | null;
};

export const CORE_PROVIDERS: Record<CoreProviderId, ProviderMeta> = {
  ollama: {
    id: "ollama",
    displayName: "Ollama",
    defaultModel: "deepseek-r1:latest",
    requiresApiKey: false,
    apiKeyEnvVar: null,
  },
  openai: {
    id: "openai",
    displayName: "OpenAI",
    defaultModel: "gpt-5.4-mini",
    requiresApiKey: true,
    apiKeyEnvVar: "OPENAI_API_KEY",
  },
  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    defaultModel: "claude-3-5-sonnet-latest",
    requiresApiKey: true,
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
  },
  google: {
    id: "google",
    displayName: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    requiresApiKey: true,
    apiKeyEnvVar: "GOOGLE_API_KEY",
  },
};

export const CORE_PROVIDER_IDS = Object.keys(CORE_PROVIDERS) as CoreProviderId[];

/** The default provider selected when no preference has been saved. */
export const DEFAULT_PROVIDER: CoreProviderId = "ollama";
