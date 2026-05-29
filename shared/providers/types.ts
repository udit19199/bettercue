import type { Question } from "../questions/types";

export type { Question };

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

export type GenerateQuestionsRequest = {
  provider: CoreProviderId;
  prompt: string;
  model: string;
  apiKey?: string | null;
  baseUrl?: string;
};

export type GenerateQuestionsResponse = {
  questions: Question[];
  raw?: unknown;
};

/**
 * Shape of a cached model list with a timestamp for staleness checks.
 */
export type CachedModels = {
  items: string[];
  fetchedAt: number;
};
