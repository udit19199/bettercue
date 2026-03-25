import { CORE_PROVIDERS, CORE_PROVIDER_IDS } from "./catalog";
import { optimizeWithAnthropic } from "./clients/anthropic";
import { optimizeWithGoogle } from "./clients/google";
import { optimizeWithOllama, listOllamaProviderModels } from "./clients/ollama";
import { optimizeWithOpenAI, listOpenAIModels } from "./clients/openai";
import { DEFAULT_SYSTEM_PROMPT, SYSTEM_PROMPTS, getSystemPrompt } from "./prompts";
import type { CoreProviderId, ListModelsRequest, OptimizeRequest, OptimizeResponse } from "./types";

export { CORE_PROVIDERS, CORE_PROVIDER_IDS };
export { DEFAULT_SYSTEM_PROMPT, SYSTEM_PROMPTS, getSystemPrompt };
export type { CoreProviderId, ListModelsRequest, OptimizeRequest, OptimizeResponse };

export async function optimizeWithProvider(request: OptimizeRequest): Promise<OptimizeResponse> {
  switch (request.provider) {
    case "ollama":
      return await optimizeWithOllama(request);
    case "openai":
      return await optimizeWithOpenAI(request);
    case "anthropic":
      return await optimizeWithAnthropic(request);
    case "google":
      return await optimizeWithGoogle(request);
    default:
      throw new Error(`Unsupported provider: ${request.provider}`);
  }
}

export async function listProviderModels(request: ListModelsRequest): Promise<string[]> {
  switch (request.provider) {
    case "ollama":
      return await listOllamaProviderModels(request);
    case "openai":
      return await listOpenAIModels(request);
    case "anthropic":
      return [];
    case "google":
      return [];
    default:
      throw new Error(`Unsupported provider: ${request.provider}`);
  }
}
