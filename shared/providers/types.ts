export type CoreProviderId = "ollama" | "openai" | "anthropic" | "google";

export type PresetId = "concise" | "precision" | "creative";

export type OptimizeRequest = {
  provider: CoreProviderId;
  prompt: string;
  model: string;
  apiKey?: string | null;
  system?: string;
  preset?: PresetId | string;
  maxOutputTokens?: number;
  baseUrl?: string;
};

export type OptimizeResponse = {
  text: string;
  raw?: unknown;
};

export type ListModelsRequest = {
  provider: CoreProviderId;
  apiKey?: string | null;
  baseUrl?: string;
};
