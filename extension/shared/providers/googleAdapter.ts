import { CORE_PROVIDERS, getSystemPrompt, listProviderModels } from "@shared/providers";

import { createRewriteAdapter } from "./rewriteAdapter";

const googleAdapter = createRewriteAdapter({
  id: "google",
  displayName: CORE_PROVIDERS.google.displayName,
  defaultModel: CORE_PROVIDERS.google.defaultModel,
  requiresApiKey: true,
  build: ({ original, model, resolvedModel, apiKey, options }) => {
    const preset = options?.preset ?? "concise";

    return {
      request: {
        provider: "google",
        prompt: original,
        model: resolvedModel,
        apiKey,
        system: getSystemPrompt(preset),
        baseUrl: options?.baseUrl,
      },
      notes: `Rewritten via Google Gemini API (model: ${model || resolvedModel}, preset: ${preset})`,
    };
  },
  listModels: async (apiKey: string | null) => {
    if (!apiKey) return [];
    return await listProviderModels({ provider: "google", apiKey });
  },
});

export default googleAdapter;
