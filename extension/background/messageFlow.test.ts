import { afterEach, describe, expect, it, mock } from "bun:test";
import type { ProviderAdapter } from "../shared/providers/provider";
import { createBackgroundMessageFlow } from "./messageFlow";

const rewritePrompt = mock(async () => ({
  optimizedPrompt: "optimized",
  notes: "done",
  tokenEstimate: 5,
  warnings: [],
}));

const listModels = mock(async () => ["model-a", "model-b"]);

const adapter: ProviderAdapter = {
  id: "openai",
  displayName: "OpenAI",
  supportsModel: () => true,
  estimateTokens: () => 1,
  rewritePrompt,
  listModels,
};

let cache: Record<string, { items: string[]; fetchedAt: number } | undefined> = {};

const flow = createBackgroundMessageFlow({
  getAdapter: (id) => (id === "openai" ? adapter : null),
  loadApiKey: mock(async () => "secret"),
  readModelsCache: async (providerId) => cache[providerId] ?? null,
  writeModelsCache: async (providerId, models, fetchedAt) => {
    cache[providerId] = { items: models, fetchedAt };
  },
  now: () => 1_000_000,
});

afterEach(() => {
  cache = {};
  rewritePrompt.mockClear();
  listModels.mockClear();
});

describe("background message flow", () => {
  it("handles rewrite messages", async () => {
    const reply = await flow.handle({
      type: "rewrite",
      payload: { adapterId: "openai", model: "gpt-4.1-mini", original: "hello", options: {} },
    });

    expect(reply.ok).toBe(true);
    if (reply.ok && "result" in reply) {
      expect(rewritePrompt).toHaveBeenCalledTimes(1);
      expect(reply.result).toMatchObject({ optimizedPrompt: "optimized" });
    }
  });

  it("loads and caches model lists", async () => {
    const reply = await flow.handle({
      type: "list-models",
      payload: { provider: "openai" },
    });

    expect(reply.ok).toBe(true);
    if (reply.ok && "models" in reply) {
      expect(reply.models).toEqual(["model-a", "model-b"]);
      expect(listModels).toHaveBeenCalledTimes(1);
    }
    expect(cache.openai?.items).toEqual(["model-a", "model-b"]);
  });

  it("returns a structured error for unknown adapters", async () => {
    const reply = await flow.handle({
      type: "rewrite",
      payload: { adapterId: "missing", model: "x", original: "hello" },
    });

    expect(reply).toEqual({ ok: false, error: "Adapter not found: missing" });
  });
});
