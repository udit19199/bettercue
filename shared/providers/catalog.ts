import type { CoreProviderId } from "./types";

export type ProviderMeta = {
  id: CoreProviderId;
  displayName: string;
  defaultModel: string;
  requiresApiKey: boolean;
};

export const CORE_PROVIDERS: Record<CoreProviderId, ProviderMeta> = {
  ollama: {
    id: "ollama",
    displayName: "Ollama",
    defaultModel: "deepseek-r1:latest",
    requiresApiKey: false,
  },
  openai: {
    id: "openai",
    displayName: "OpenAI",
    defaultModel: "gpt-5.4-mini",
    requiresApiKey: true,
  },
  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    defaultModel: "claude-3-5-sonnet-latest",
    requiresApiKey: true,
  },
  google: {
    id: "google",
    displayName: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    requiresApiKey: true,
  },
};

export const CORE_PROVIDER_IDS = Object.keys(CORE_PROVIDERS) as CoreProviderId[];
