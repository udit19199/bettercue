import { CORE_PROVIDERS, CORE_PROVIDER_IDS, DEFAULT_PROVIDER } from "./catalog";
import { optimizeWithAnthropic, listAnthropicModels } from "./clients/anthropic";
import { optimizeWithGoogle, listGoogleModels } from "./clients/google";
import { optimizeWithOllama, listOllamaProviderModels } from "./clients/ollama";
import { optimizeWithOpenAI, listOpenAIModels } from "./clients/openai";
import { DEFAULT_SYSTEM_PROMPT, getSystemPrompt } from "./prompts";
import { QUESTIONS_SYSTEM_PROMPT } from "../questions/systemPrompt";
import { calculateCost } from "./pricing";
import { parseQuestionsResponse } from "../questions/parse";
import type { CachedModels, CoreProviderId, ListModelsRequest, OptimizeRequest, OptimizeResponse, GenerateQuestionsRequest, GenerateQuestionsResponse, Question, Usage } from "./types";

export { CORE_PROVIDERS, CORE_PROVIDER_IDS, DEFAULT_PROVIDER };
export { DEFAULT_SYSTEM_PROMPT, getSystemPrompt };
export { calculateCost };
export type {
  CoreProviderId,
  CachedModels,
  ListModelsRequest,
  OptimizeRequest,
  OptimizeResponse,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  Question,
  Usage,
};

// ─── Provider implementation registry ────────────────────────────────────────

type ProviderImpl = {
  optimize: (request: OptimizeRequest) => Promise<OptimizeResponse>;
  listModels: (request: ListModelsRequest) => Promise<string[]>;
};

const PROVIDER_IMPLS: Record<CoreProviderId, ProviderImpl> = {
  ollama: { optimize: optimizeWithOllama, listModels: listOllamaProviderModels },
  openai: { optimize: optimizeWithOpenAI, listModels: listOpenAIModels },
  anthropic: { optimize: optimizeWithAnthropic, listModels: listAnthropicModels },
  google: { optimize: optimizeWithGoogle, listModels: listGoogleModels },
};

export async function optimizeWithProvider(request: OptimizeRequest): Promise<OptimizeResponse> {
  const impl = PROVIDER_IMPLS[request.provider];
  if (!impl) throw new Error(`Unsupported provider: ${request.provider}`);
  return await impl.optimize(request);
}

export async function listProviderModels(request: ListModelsRequest): Promise<string[]> {
  const impl = PROVIDER_IMPLS[request.provider];
  if (!impl) throw new Error(`Unsupported provider: ${request.provider}`);
  return await impl.listModels(request);
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
    ...request,
    system: QUESTIONS_SYSTEM_PROMPT,
    maxOutputTokens: 512,
  };

  const response = await optimizeWithProvider(optimizeRequest);
  const questions = parseQuestionsResponse(response.text);

  return { questions, raw: response.raw };
}
