import { CORE_PROVIDERS, getSystemPrompt, optimizeWithProvider } from "@shared/providers";
import { estimateTokens, heuristicTokens } from "../tokens/estimator";
import type { ProviderAdapter, RewriteOptions, RewriteResult } from "./provider";

const googleAdapter: ProviderAdapter = {
  id: "google",
  displayName: CORE_PROVIDERS.google.displayName,
  supportsModel: (model: string) => !!model,
  estimateTokens: (text: string) => heuristicTokens(text),
  rewritePrompt: async (
    original: string,
    model: string,
    apiKey: string | null,
    options?: RewriteOptions
  ): Promise<RewriteResult> => {
    if (!apiKey) throw new Error("Missing Google API key. Open Settings to add one.");

    const preset = options?.preset ?? "concise";
    const response = await optimizeWithProvider({
      provider: "google",
      prompt: original,
      model: model || CORE_PROVIDERS.google.defaultModel,
      apiKey,
      system: getSystemPrompt(preset),
      baseUrl: options?.baseUrl,
    });

    const optimizedPrompt = response.text.trim();
    const tokenEstimate = await estimateTokens(optimizedPrompt, options?.preciseTokens ?? false);

    return {
      optimizedPrompt,
      notes: `Rewritten via Google Gemini API (model: ${model}, preset: ${preset})`,
      tokenEstimate,
      warnings: [],
    };
  },
};

export default googleAdapter;
