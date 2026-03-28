import { CORE_PROVIDERS, getSystemPrompt } from "@shared/providers";

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
});

export default googleAdapter;
