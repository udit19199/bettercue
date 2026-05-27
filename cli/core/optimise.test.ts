import { afterEach, describe, expect, it, mock } from "bun:test";

mock.module("../../shared/providers/index.ts", () => {
  const optimizeWithProvider = mock(async (request: any) => {
    return {
      text: `${request.provider}:${request.model}:${request.system}`,
    };
  });

  const listProviderModels = mock(async () => ["model-a", "model-b"]);
  const generateQuestionsWithProvider = mock(async () => ({ questions: [] }));
  const buildEnhancedPrompt = mock((original: string) => original);

  return {
    CORE_PROVIDER_IDS: ["ollama", "openai", "anthropic", "google"],
    CORE_PROVIDERS: {
      ollama: { displayName: "Ollama", defaultModel: "deepseek-r1:latest", requiresApiKey: false, apiKeyEnvVar: null },
      openai: { displayName: "OpenAI", defaultModel: "gpt-4.1-mini", requiresApiKey: true, apiKeyEnvVar: "OPENAI_API_KEY" },
      anthropic: { displayName: "Anthropic", defaultModel: "claude-3-5-sonnet-latest", requiresApiKey: true, apiKeyEnvVar: "ANTHROPIC_API_KEY" },
      google: { displayName: "Google Gemini", defaultModel: "gemini-2.5-flash", requiresApiKey: true, apiKeyEnvVar: "GOOGLE_API_KEY" },
    },
    DEFAULT_PROVIDER: "ollama",
    optimizeWithProvider,
    listProviderModels,
    generateQuestionsWithProvider,
    buildEnhancedPrompt,
  };
});

mock.module("./keychain.ts", () => ({
  loadProviderKey: mock(() => "from-keychain"),
  removeProviderKey: mock(() => true),
  saveProviderKey: mock(() => undefined),
}));

mock.module("./modelCache.ts", () => ({
  clearCachedModels: mock(async () => undefined),
  loadCachedModels: mock(async () => ["model-a", "model-b"]),
  saveCachedModels: mock(async () => undefined),
}));

mock.module("./persistence.ts", () => ({
  loadConfig: mock(() => ({})),
  saveConfig: mock(() => undefined),
}));

mock.module("@inquirer/search", () => ({
  default: mock(async ({ source }: { source: (input?: string) => Promise<Array<{ value: string }>> }) => {
    const choices = await source("");
    return choices.find((choice) => choice.value !== "__refresh__")?.value ?? "model-a";
  }),
}));

const optimizeModule = await import("./optimise.ts");

describe("resolveApiKey", () => {
  it("prefers keychain on macOS", () => {
    // The function only calls loadProviderKey on darwin; mock platform to test that path
    const origPlatform = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", { value: "darwin" });
    try {
      expect(optimizeModule.resolveApiKey("openai")).toBe("from-keychain");
    } finally {
      Object.defineProperty(process, "platform", origPlatform!);
    }
  });

  it("returns null for ollama", () => {
    expect(optimizeModule.resolveApiKey("ollama")).toBeNull();
  });
});

describe("optimisePrompt", () => {
  it("forwards the provider request and system prompt", async () => {
    const text = await optimizeModule.optimisePrompt("make this better", {
      provider: "ollama",
      model: "deepseek-r1:latest",
    });
    expect(text).toContain("ollama");
    expect(text).toContain("deepseek-r1:latest");
    expect(text).toContain("Better-Cue");
  });
});
