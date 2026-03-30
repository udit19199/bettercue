import { CORE_PROVIDERS, CORE_PROVIDER_IDS } from "./catalog";
import { optimizeWithAnthropic, listAnthropicModels } from "./clients/anthropic";
import { optimizeWithGoogle, listGoogleModels } from "./clients/google";
import { optimizeWithOllama, listOllamaProviderModels } from "./clients/ollama";
import { optimizeWithOpenAI, listOpenAIModels } from "./clients/openai";
import { DEFAULT_SYSTEM_PROMPT, SYSTEM_PROMPTS, QUESTIONS_SYSTEM_PROMPT, getSystemPrompt } from "./prompts";
import type { CoreProviderId, ListModelsRequest, OptimizeRequest, OptimizeResponse, GenerateQuestionsRequest, GenerateQuestionsResponse } from "./types";

export { CORE_PROVIDERS, CORE_PROVIDER_IDS };
export { DEFAULT_SYSTEM_PROMPT, SYSTEM_PROMPTS, QUESTIONS_SYSTEM_PROMPT, getSystemPrompt };
export type { CoreProviderId, ListModelsRequest, OptimizeRequest, OptimizeResponse, GenerateQuestionsRequest, GenerateQuestionsResponse };

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
 * Uses the same underlying optimize infrastructure but with a special system prompt.
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
    maxOutputTokens: 256,
    baseUrl: request.baseUrl,
  };

  const response = await optimizeWithProvider(optimizeRequest);

  // Parse the JSON response
  try {
    const text = response.text.trim();
    // Extract JSON array from response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0]);
      if (Array.isArray(questions)) {
        // Filter to only valid string questions
        const validQuestions = questions.filter(
          (q): q is string => typeof q === "string" && q.trim().length > 0
        );
        return { questions: validQuestions, raw: response.raw };
      }
    }
    return { questions: [], raw: response.raw };
  } catch {
    // If parsing fails, return empty questions
    return { questions: [], raw: response.raw };
  }
}
