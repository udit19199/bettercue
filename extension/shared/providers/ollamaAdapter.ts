import { CORE_PROVIDERS, DEFAULT_SYSTEM_PROMPT, listProviderModels } from "@shared/providers";
import { DEFAULT_OLLAMA_GENERATE_URL } from "@shared/ollama";
import { createRewriteAdapter } from "./rewriteAdapter";

const ollamaAdapter = createRewriteAdapter({
  id: "ollama",
  displayName: CORE_PROVIDERS.ollama.displayName,
  defaultModel: CORE_PROVIDERS.ollama.defaultModel,
  requiresApiKey: false,
  build: ({ original, model, resolvedModel, options }) => ({
    request: {
      provider: "ollama",
      prompt: original,
      model: resolvedModel,
      system: DEFAULT_SYSTEM_PROMPT,
      baseUrl: options?.baseUrl ?? DEFAULT_OLLAMA_GENERATE_URL,
    },
    notes: `Rewritten via Ollama (/api/generate, model: ${model || resolvedModel})`,
  }),
  listModels: async () => await listProviderModels({ provider: "ollama" }),
});

export default ollamaAdapter;
