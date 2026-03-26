import { afterEach, describe, expect, it, mock } from "bun:test";

mock.module("../../shared/providers/index.ts", () => {
  const optimizeWithProvider = mock(async (request: any) => {
    return {
      text: `${request.provider}:${request.model}:${request.system}`,
    };
  });

  return {
    CORE_PROVIDER_IDS: ["ollama", "openai", "anthropic", "google"],
    CORE_PROVIDERS: {
      ollama: { displayName: "Ollama", defaultModel: "deepseek-r1:latest", requiresApiKey: false },
      openai: { displayName: "OpenAI", defaultModel: "gpt-4.1-mini", requiresApiKey: true },
      anthropic: { displayName: "Anthropic", defaultModel: "claude-3-5-sonnet-latest", requiresApiKey: true },
      google: { displayName: "Google Gemini", defaultModel: "gemini-2.5-flash", requiresApiKey: true },
    },
    optimizeWithProvider,
  };
});

mock.module("./keychain.ts", () => ({
  loadProviderKey: mock(() => "from-keychain"),
  removeProviderKey: mock(() => true),
  saveProviderKey: mock(() => undefined),
}));

const optimizeModule = await import("./optimize.ts");

describe("resolveApiKey", () => {
  it("prefers keychain on macOS", () => {
    expect(optimizeModule.resolveApiKey("openai")).toBe("from-keychain");
  });

  it("returns null for ollama", () => {
    expect(optimizeModule.resolveApiKey("ollama")).toBeNull();
  });
});

describe("optimizePrompt", () => {
  it("forwards the provider request and system prompt", async () => {
    const text = await optimizeModule.optimizePrompt("make this better", {
      provider: "ollama",
      model: "deepseek-r1:latest",
    });

    expect(text).toContain("ollama:deepseek-r1:latest:");
  });
});
