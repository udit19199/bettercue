import type { ProviderAdapter, RewriteResult } from "./provider";

const mockAdapter: ProviderAdapter = {
  id: "mock",
  displayName: "Mock Provider",
  supportsModel: (_model: string) => true,
  estimateTokens: (text: string) => {
    // very rough heuristic: 1 token per 4 chars
    return Math.max(1, Math.round(text.length / 4));
  },
  rewritePrompt: async (original: string) => {
    const optimized = `[MOCK-OPTIMIZED]\n${original.trim()}`;
    const tokenEstimate = Math.round(optimized.length / 4);
    const result: RewriteResult = {
      optimizedPrompt: optimized,
      notes: "This is a mock rewrite for local testing.",
      tokenEstimate,
      warnings: [],
    };
    return result;
  },
  listModels: async (_apiKey: string | null) => {
    return ["mock-model", "mock-model-large"];
  },
};

export default mockAdapter;
