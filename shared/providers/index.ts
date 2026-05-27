import { CORE_PROVIDERS, CORE_PROVIDER_IDS, DEFAULT_PROVIDER } from "./catalog";
import { optimizeWithAnthropic, listAnthropicModels } from "./clients/anthropic";
import { optimizeWithGoogle, listGoogleModels } from "./clients/google";
import { optimizeWithOllama, listOllamaProviderModels } from "./clients/ollama";
import { optimizeWithOpenAI, listOpenAIModels } from "./clients/openai";
import { DEFAULT_SYSTEM_PROMPT, getSystemPrompt } from "./prompts";
import { QUESTIONS_SYSTEM_PROMPT } from "../questions/systemPrompt";
import { parseQuestionsResponse } from "../questions/parse";
import type { CachedModels, CoreProviderId, ListModelsRequest, OptimizeRequest, OptimizeResponse, GenerateQuestionsRequest, GenerateQuestionsResponse, Question } from "./types";

export { CORE_PROVIDERS, CORE_PROVIDER_IDS, DEFAULT_PROVIDER };
export { DEFAULT_SYSTEM_PROMPT, getSystemPrompt };
export type {
  CoreProviderId,
  CachedModels,
  ListModelsRequest,
  OptimizeRequest,
  OptimizeResponse,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  Question,
};

// Re-export from the questions module for direct use
export { buildEnhancedPrompt } from "../questions/enhance";
export { parseQuestionsResponse } from "../questions/parse";

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
      return await listAnthropicModels(request);
    case "google":
      return await listGoogleModels(request);
    default:
      throw new Error(`Unsupported provider: ${request.provider}`);
  }
}

/**
 * Generate clarifying questions for a given prompt.
 *
 * Sends the prompt to the selected provider's LLM with a special system
 * prompt that asks for structured questions in JSON format, then parses
 * the response into `Question[]`.
 */
export async function generateQuestionsWithProvider(
  request: GenerateQuestionsRequest
): Promise<GenerateQuestionsResponse> {
  const optimizeRequest: OptimizeRequest = {
    provider: request.provider,
    prompt: request.prompt,
    model: request.model,
    apiKey: request.apiKey,
    system: QUESTIONS_SYSTEM_PROMPT,
    maxOutputTokens: 512,
    baseUrl: request.baseUrl,
  };

  const response = await optimizeWithProvider(optimizeRequest);
  const questions = parseQuestionsResponse(response.text);

  return { questions, raw: response.raw };
}
