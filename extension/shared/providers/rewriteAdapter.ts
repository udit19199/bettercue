import { optimizeWithProvider } from "@shared/providers";

import { estimateTokens, heuristicTokens } from "../tokens/estimator";
import type { ProviderAdapter, RewriteOptions, RewriteResult } from "./provider";

type RewriteRequest = {
  original: string;
  model: string;
  resolvedModel: string;
  apiKey: string | null;
  options?: RewriteOptions;
};

type RewriteOutput = {
  request: Parameters<typeof optimizeWithProvider>[0];
  notes: string;
};

type RewriteAdapterConfig = {
  id: string;
  displayName: string;
  defaultModel: string;
  requiresApiKey?: boolean;
  build: (request: RewriteRequest) => RewriteOutput;
  listModels?: (apiKey: string | null) => Promise<string[]>;
};

function missingApiKeyMessage(displayName: string): string {
  return `Missing ${displayName} API key. Open Settings to add one.`;
}

export function createRewriteAdapter(config: RewriteAdapterConfig): ProviderAdapter {
  return {
    id: config.id,
    displayName: config.displayName,
    supportsModel: (model: string) => !!model,
    estimateTokens: (text: string) => heuristicTokens(text),
    rewritePrompt: async (
      original: string,
      model: string,
      apiKey: string | null,
      options?: RewriteOptions
    ): Promise<RewriteResult> => {
      if (config.requiresApiKey !== false && !apiKey) {
        throw new Error(missingApiKeyMessage(config.displayName));
      }

      const resolvedModel = model || config.defaultModel;
      const { request, notes } = config.build({
        original,
        model,
        resolvedModel,
        apiKey,
        options,
      });

      const response = await optimizeWithProvider(request);
      const optimizedPrompt = response.text.trim();
      const tokenEstimate = await estimateTokens(optimizedPrompt, options?.preciseTokens ?? false);

      return {
        optimizedPrompt,
        notes,
        tokenEstimate,
        warnings: [],
      };
    },
    listModels: config.listModels,
  };
}
