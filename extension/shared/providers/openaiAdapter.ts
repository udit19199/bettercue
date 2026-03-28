import { CORE_PROVIDERS, getSystemPrompt, listProviderModels } from "@shared/providers";

import { createRewriteAdapter } from "./rewriteAdapter";

const openaiAdapter = createRewriteAdapter({
  id: "openai",
  displayName: CORE_PROVIDERS.openai.displayName,
  defaultModel: CORE_PROVIDERS.openai.defaultModel,
  requiresApiKey: true,
  build: ({ original, model, resolvedModel, apiKey, options }) => {
    const preset = options?.preset ?? "concise";
    const maxOutputTokens = options?.maxTokens ?? 512;

    return {
      request: {
        provider: "openai",
        prompt: original,
        model: resolvedModel,
        apiKey,
        system: getSystemPrompt(preset),
        maxOutputTokens,
      },
      notes: `Rewritten via OpenAI Responses API (model: ${model || resolvedModel}, preset: ${preset}, store: false)`,
    };
  },
  listModels: async (apiKey: string | null) => {
    if (!apiKey) return [];
    return await listProviderModels({ provider: "openai", apiKey });
  },
});

export default openaiAdapter;
