import type { CoreProviderId, Usage } from "./types";

/**
 * Model pricing information for various AI providers.
 * Prices are per 1M tokens (input/output) in USD.
 * Data sourced from official provider pricing pages as of 2024.
 */

export type ModelPricing = {
  inputPer1M: number;
  outputPer1M: number;
  /** Optional display name for the model */
  displayName?: string;
};

export type ProviderPricing = {
  [modelId: string]: ModelPricing;
};

/**
 * OpenAI model pricing
 * Source: https://openai.com/pricing
 */
export const OPENAI_PRICING: ProviderPricing = {
  // GPT-4o series
  "gpt-4o": { inputPer1M: 2.50, outputPer1M: 10.00, displayName: "GPT-4o" },
  "gpt-4o-2024-11-20": { inputPer1M: 2.50, outputPer1M: 10.00 },
  "gpt-4o-2024-08-06": { inputPer1M: 2.50, outputPer1M: 10.00 },
  "gpt-4o-2024-05-13": { inputPer1M: 5.00, outputPer1M: 15.00 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60, displayName: "GPT-4o Mini" },
  "gpt-4o-mini-2024-07-18": { inputPer1M: 0.15, outputPer1M: 0.60 },
  // GPT-4.1 series
  "gpt-4.1": { inputPer1M: 2.00, outputPer1M: 8.00, displayName: "GPT-4.1" },
  "gpt-4.1-mini": { inputPer1M: 0.40, outputPer1M: 1.60, displayName: "GPT-4.1 Mini" },
  "gpt-4.1-nano": { inputPer1M: 0.10, outputPer1M: 0.40, displayName: "GPT-4.1 Nano" },
  // GPT-5 series (placeholder pricing)
  "gpt-5.4-mini": { inputPer1M: 0.20, outputPer1M: 0.80, displayName: "GPT-5.4 Mini" },
  // GPT-4 Turbo
  "gpt-4-turbo": { inputPer1M: 10.00, outputPer1M: 30.00, displayName: "GPT-4 Turbo" },
  "gpt-4-turbo-2024-04-09": { inputPer1M: 10.00, outputPer1M: 30.00 },
  "gpt-4-turbo-preview": { inputPer1M: 10.00, outputPer1M: 30.00 },
  // GPT-4
  "gpt-4": { inputPer1M: 30.00, outputPer1M: 60.00, displayName: "GPT-4" },
  "gpt-4-0613": { inputPer1M: 30.00, outputPer1M: 60.00 },
  // GPT-3.5
  "gpt-3.5-turbo": { inputPer1M: 0.50, outputPer1M: 1.50, displayName: "GPT-3.5 Turbo" },
  "gpt-3.5-turbo-0125": { inputPer1M: 0.50, outputPer1M: 1.50 },
  // o1 reasoning models
  "o1": { inputPer1M: 15.00, outputPer1M: 60.00, displayName: "o1" },
  "o1-2024-12-17": { inputPer1M: 15.00, outputPer1M: 60.00 },
  "o1-preview": { inputPer1M: 15.00, outputPer1M: 60.00, displayName: "o1 Preview" },
  "o1-preview-2024-09-12": { inputPer1M: 15.00, outputPer1M: 60.00 },
  "o1-mini": { inputPer1M: 3.00, outputPer1M: 12.00, displayName: "o1 Mini" },
  "o1-mini-2024-09-12": { inputPer1M: 3.00, outputPer1M: 12.00 },
  "o3-mini": { inputPer1M: 1.10, outputPer1M: 4.40, displayName: "o3 Mini" },
};

/**
 * Anthropic model pricing
 * Source: https://www.anthropic.com/pricing
 */
export const ANTHROPIC_PRICING: ProviderPricing = {
  // Claude 3.5 series
  "claude-3-5-sonnet-latest": { inputPer1M: 3.00, outputPer1M: 15.00, displayName: "Claude 3.5 Sonnet" },
  "claude-3-5-sonnet-20241022": { inputPer1M: 3.00, outputPer1M: 15.00 },
  "claude-3-5-sonnet-20240620": { inputPer1M: 3.00, outputPer1M: 15.00 },
  "claude-3-5-haiku-latest": { inputPer1M: 0.80, outputPer1M: 4.00, displayName: "Claude 3.5 Haiku" },
  "claude-3-5-haiku-20241022": { inputPer1M: 0.80, outputPer1M: 4.00 },
  // Claude 3 series
  "claude-3-opus-latest": { inputPer1M: 15.00, outputPer1M: 75.00, displayName: "Claude 3 Opus" },
  "claude-3-opus-20240229": { inputPer1M: 15.00, outputPer1M: 75.00 },
  "claude-3-sonnet-20240229": { inputPer1M: 3.00, outputPer1M: 15.00, displayName: "Claude 3 Sonnet" },
  "claude-3-haiku-20240307": { inputPer1M: 0.25, outputPer1M: 1.25, displayName: "Claude 3 Haiku" },
  // Claude 4 series (placeholder pricing)
  "claude-sonnet-4-20250514": { inputPer1M: 3.00, outputPer1M: 15.00, displayName: "Claude Sonnet 4" },
  "claude-opus-4-20250514": { inputPer1M: 15.00, outputPer1M: 75.00, displayName: "Claude Opus 4" },
};

/**
 * Google Gemini model pricing
 * Source: https://ai.google.dev/pricing
 */
export const GOOGLE_PRICING: ProviderPricing = {
  // Gemini 2.5 series
  "gemini-2.5-pro-preview-05-06": { inputPer1M: 1.25, outputPer1M: 10.00, displayName: "Gemini 2.5 Pro Preview" },
  "gemini-2.5-flash-preview-05-20": { inputPer1M: 0.15, outputPer1M: 0.60, displayName: "Gemini 2.5 Flash Preview" },
  "gemini-2.5-flash": { inputPer1M: 0.15, outputPer1M: 0.60, displayName: "Gemini 2.5 Flash" },
  // Gemini 2.0 series
  "gemini-2.0-flash": { inputPer1M: 0.10, outputPer1M: 0.40, displayName: "Gemini 2.0 Flash" },
  "gemini-2.0-flash-exp": { inputPer1M: 0.10, outputPer1M: 0.40, displayName: "Gemini 2.0 Flash Exp" },
  "gemini-2.0-flash-lite": { inputPer1M: 0.075, outputPer1M: 0.30, displayName: "Gemini 2.0 Flash Lite" },
  // Gemini 1.5 series
  "gemini-1.5-pro": { inputPer1M: 1.25, outputPer1M: 5.00, displayName: "Gemini 1.5 Pro" },
  "gemini-1.5-pro-latest": { inputPer1M: 1.25, outputPer1M: 5.00 },
  "gemini-1.5-flash": { inputPer1M: 0.075, outputPer1M: 0.30, displayName: "Gemini 1.5 Flash" },
  "gemini-1.5-flash-latest": { inputPer1M: 0.075, outputPer1M: 0.30 },
  "gemini-1.5-flash-8b": { inputPer1M: 0.0375, outputPer1M: 0.15, displayName: "Gemini 1.5 Flash 8B" },
  // Gemini 1.0 Pro
  "gemini-1.0-pro": { inputPer1M: 0.50, outputPer1M: 1.50, displayName: "Gemini 1.0 Pro" },
  "gemini-pro": { inputPer1M: 0.50, outputPer1M: 1.50, displayName: "Gemini Pro" },
};

/**
 * Ollama models are free (local inference)
 */
export const OLLAMA_PRICING: ProviderPricing = {};

/**
 * Combined pricing lookup by provider
 */
export const PROVIDER_PRICING: Record<CoreProviderId, ProviderPricing> = {
  openai: OPENAI_PRICING,
  anthropic: ANTHROPIC_PRICING,
  google: GOOGLE_PRICING,
  ollama: OLLAMA_PRICING,
};

/**
 * Get pricing for a specific model from a provider.
 * Returns null if pricing is not available.
 */
export function getModelPricing(
  provider: string,
  modelId: string
): ModelPricing | null {
  const providerPricing = PROVIDER_PRICING[provider as CoreProviderId];
  if (!providerPricing) return null;

  // Direct lookup
  if (providerPricing[modelId]) {
    return providerPricing[modelId];
  }

  // Try to find a matching prefix (for dated model versions).
  // Sort by key length descending so "gpt-4o-mini" is checked before "gpt-4o"
  // to avoid a shorter prefix matching a longer model ID.
  const sorted = Object.entries(providerPricing as Record<string, ModelPricing>).sort(([a], [b]) => b.length - a.length);
  for (const [key, pricing] of sorted) {
    if (modelId.startsWith(key) || key.startsWith(modelId)) {
      return pricing;
    }
  }

  return null;
}

/**
 * Format pricing for display.
 * Returns a string like "$0.15/$0.60" (input/output per 1M tokens)
 */
export function formatPricing(pricing: ModelPricing): string {
  const formatPrice = (price: number): string => {
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    }
    return `$${price.toFixed(3)}`.replace(/0+$/, "").replace(/\.$/, "");
  };

  return `${formatPrice(pricing.inputPer1M)}/${formatPrice(pricing.outputPer1M)}`;
}

/**
 * Get a formatted price label for a model.
 * Returns "Free" for Ollama, price string for others, or empty string if unknown.
 */
export function getModelPriceLabel(provider: string, modelId: string): string {
  if (provider === "ollama") {
    return "Free (local)";
  }

  const pricing = getModelPricing(provider, modelId);
  if (!pricing) {
    return "";
  }

  return formatPricing(pricing);
}

export type ModelInfo = {
  id: string;
  displayName: string;
  priceLabel: string;
  pricing: ModelPricing | null;
};

/**
 * Enrich a list of model IDs with display names and pricing.
 */
export function enrichModelsWithPricing(
  provider: string,
  modelIds: string[]
): ModelInfo[] {
  return modelIds.map((id) => {
    const pricing = getModelPricing(provider, id);
    const displayName = pricing?.displayName ?? id;
    const priceLabel = getModelPriceLabel(provider, id);

    return {
      id,
      displayName,
      priceLabel,
      pricing,
    };
  });
}

/**
 * Calculate the cost of an API call based on token usage and model pricing.
 * Returns the total cost in USD and a human-readable label.
 */
export function calculateCost(
  provider: string,
  modelId: string,
  usage: Usage
): { cost: number; label: string } {
  if (provider === "ollama") {
    return { cost: 0, label: "Free (local)" };
  }

  const pricing = getModelPricing(provider, modelId);
  if (!pricing) {
    return { cost: 0, label: "Pricing unknown" };
  }

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPer1M;
  const totalCost = inputCost + outputCost;

  return {
    cost: totalCost,
    label: formatCost(totalCost),
  };
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.001) return `$${cost.toFixed(6)}`;
  if (cost < 0.01) return `$${cost.toFixed(5)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}
