export type RewriteOptions = {
  preset?: "concise" | "precision" | "creative" | string;
  maxTokens?: number;
};

export type RewriteResult = {
  optimizedPrompt: string;
  notes?: string;
  tokenEstimate?: number;
  warnings?: string[];
};

export interface ProviderAdapter {
  id: string;
  displayName: string;
  supportsModel(model: string): boolean;
  estimateTokens(text: string): number;
  rewritePrompt(
    original: string,
    model: string,
    apiKey: string | null,
    options?: RewriteOptions
  ): Promise<RewriteResult>;
}
