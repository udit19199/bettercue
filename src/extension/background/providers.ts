import mockAdapter from "../shared/providers/mockAdapter";
import openaiAdapter from "../shared/providers/openaiAdapter";
import type { ProviderAdapter } from "../shared/providers/provider";

const adapters: Record<string, ProviderAdapter> = {
  mock: mockAdapter,
  openai: openaiAdapter,
};

export function getAdapter(id: string) {
  return adapters[id] ?? null;
}

export function listAdapters() {
  return Object.values(adapters).map((a) => ({ id: a.id, name: a.displayName }));
}
