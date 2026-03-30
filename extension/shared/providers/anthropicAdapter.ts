import { CORE_PROVIDERS, getSystemPrompt, listProviderModels } from "@shared/providers";

import { createRewriteAdapter } from "./rewriteAdapter";

const anthropicAdapter = createRewriteAdapter({
  id: "anthropic",
  displayName: CORE_PROVIDERS.anthropic.displayName,
  defaultModel: CORE_PROVIDERS.anthropic.defaultModel,
  requiresApiKey: true,
  build: ({ original, model, resolvedModel, apiKey, options }) => {
    const preset = options?.preset ?? "concise";

    return {
      request: {
        provider: "anthropic",
        prompt: original,
        model: resolvedModel,
        apiKey,
        system: getSystemPrompt(preset),
        maxOutputTokens: options?.maxTokens ?? 1024,
        baseUrl: options?.baseUrl,
      },
      notes: `Rewritten via Anthropic Messages API (model: ${model || resolvedModel}, preset: ${preset})`,
    };
  },
  listModels: async (apiKey: string | null) => {
    if (!apiKey) return [];
    return await listProviderModels({ provider: "anthropic", apiKey });
  },
});

export default anthropicAdapter;
