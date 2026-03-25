import mockAdapter from "../shared/providers/mockAdapter";
import anthropicAdapter from "../shared/providers/anthropicAdapter";
import googleAdapter from "../shared/providers/googleAdapter";
import ollamaAdapter from "../shared/providers/ollamaAdapter";
import openaiAdapter from "../shared/providers/openaiAdapter";
import type { ProviderAdapter } from "../shared/providers/provider";

const adapters: Record<string, ProviderAdapter> = {
  mock: mockAdapter,
  ollama: ollamaAdapter,
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  google: googleAdapter,
};

export function getAdapter(id: string) {
  return adapters[id] ?? null;
}

export function listAdapters() {
  return Object.values(adapters).map((a) => ({ id: a.id, name: a.displayName }));
}
