/**
 * OpenAI provider adapter.
 */

import { CORE_PROVIDERS, optimizeWithProvider, listProviderModels, getSystemPrompt } from "@shared/providers";
import { estimateTokens, heuristicTokens } from "../tokens/estimator";
import type { ProviderAdapter, RewriteOptions, RewriteResult } from "./provider";

const openaiAdapter: ProviderAdapter = {
  id: "openai",
  displayName: CORE_PROVIDERS.openai.displayName,
  supportsModel: (model: string) => !!model,
  estimateTokens: (text: string) => heuristicTokens(text),
  rewritePrompt: async (
    original: string,
    model: string,
    apiKey: string | null,
    options?: RewriteOptions
  ): Promise<RewriteResult> => {
    if (!apiKey) throw new Error("Missing OpenAI API key. Open Settings to add one.");

    const preset = options?.preset ?? "concise";
    const instructions = getSystemPrompt(preset);
    const maxOutputTokens = options?.maxTokens ?? 512;
    const usePrecise = options?.preciseTokens ?? false;

    const response = await optimizeWithProvider({
      provider: "openai",
      prompt: original,
      model: model || CORE_PROVIDERS.openai.defaultModel,
      apiKey,
      system: instructions,
      maxOutputTokens,
    });

    const optimizedPrompt = response.text.trim();
    const tokenEstimate = await estimateTokens(optimizedPrompt, usePrecise);

    return {
      optimizedPrompt,
      notes: `Rewritten via OpenAI Responses API (model: ${model}, preset: ${preset}, store: false)`,
      tokenEstimate,
      warnings: [],
    };
  },
  listModels: async (apiKey: string | null) => {
    if (!apiKey) return [];
    return await listProviderModels({ provider: "openai", apiKey });
  },
};

export default openaiAdapter;
