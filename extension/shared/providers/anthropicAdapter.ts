import { CORE_PROVIDERS, getSystemPrompt, optimizeWithProvider } from "@shared/providers";
import { estimateTokens, heuristicTokens } from "../tokens/estimator";
import type { ProviderAdapter, RewriteOptions, RewriteResult } from "./provider";

const anthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  displayName: CORE_PROVIDERS.anthropic.displayName,
  supportsModel: (model: string) => !!model,
  estimateTokens: (text: string) => heuristicTokens(text),
  rewritePrompt: async (
    original: string,
    model: string,
    apiKey: string | null,
    options?: RewriteOptions
  ): Promise<RewriteResult> => {
    if (!apiKey) throw new Error("Missing Anthropic API key. Open Settings to add one.");

    const preset = options?.preset ?? "concise";
    const response = await optimizeWithProvider({
      provider: "anthropic",
      prompt: original,
      model: model || CORE_PROVIDERS.anthropic.defaultModel,
      apiKey,
      system: getSystemPrompt(preset),
      maxOutputTokens: options?.maxTokens ?? 1024,
      baseUrl: options?.baseUrl,
    });

    const optimizedPrompt = response.text.trim();
    const tokenEstimate = await estimateTokens(optimizedPrompt, options?.preciseTokens ?? false);

    return {
      optimizedPrompt,
      notes: `Rewritten via Anthropic Messages API (model: ${model}, preset: ${preset})`,
      tokenEstimate,
      warnings: [],
    };
  },
};

export default anthropicAdapter;
