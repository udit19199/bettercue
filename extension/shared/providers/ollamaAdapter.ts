import { CORE_PROVIDERS, DEFAULT_SYSTEM_PROMPT, optimizeWithProvider, listProviderModels } from "@shared/providers";
import { DEFAULT_OLLAMA_GENERATE_URL } from "@shared/ollama";
import { estimateTokens, heuristicTokens } from "../tokens/estimator";
import type { ProviderAdapter, RewriteOptions, RewriteResult } from "./provider";

const ollamaAdapter: ProviderAdapter = {
  id: "ollama",
  displayName: CORE_PROVIDERS.ollama.displayName,
  supportsModel: (model: string) => !!model,
  estimateTokens: (text: string) => heuristicTokens(text),
  rewritePrompt: async (
    original: string,
    model: string,
    _apiKey: string | null,
    options?: RewriteOptions
  ): Promise<RewriteResult> => {
    const response = await optimizeWithProvider({
      provider: "ollama",
      prompt: original,
      model: model || CORE_PROVIDERS.ollama.defaultModel,
      system: DEFAULT_SYSTEM_PROMPT,
      baseUrl: options?.baseUrl ?? DEFAULT_OLLAMA_GENERATE_URL,
    });

    const optimizedPrompt = response.text.trim();
    const tokenEstimate = await estimateTokens(optimizedPrompt, options?.preciseTokens ?? false);

    return {
      optimizedPrompt,
      notes: `Rewritten via Ollama (/api/generate, model: ${model || CORE_PROVIDERS.ollama.defaultModel})`,
      tokenEstimate,
      warnings: [],
    };
  },
  listModels: async () => await listProviderModels({ provider: "ollama" }),
};

export default ollamaAdapter;
