import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

// ─── Mock state — implements shared mutable mock functions ─────────────────
//     Uses global fetch mocking instead of mock.module on the provider index
//     so the real dispatch and client code runs (and doesn't leak across files).

const mockKeychain = {
  loadProviderKey: mock(async (): Promise<string | null> => "from-keychain"),
  removeProviderKey: mock(async () => true),
  saveProviderKey: mock(async () => undefined),
};

const mockModelCache = {
  clearCachedModels: mock(async () => undefined),
  loadCachedModels: mock(async () => ["model-a", "model-b"]),
  saveCachedModels: mock(async () => undefined),
};

const mockQuestions = {
  buildEnhancedPrompt: mock((original: string) => original),
};

const mockPersistence = {
  loadConfig: mock(async () => ({})),
  saveConfig: mock(async () => undefined),
};

const mockSearch = {
  default: mock(async ({ source }: { source: (input?: string) => Promise<Array<{ value: string }>> }) => {
    const choices = await source("");
    return choices.find((choice: any) => choice.value !== "__refresh__")?.value ?? "model-a";
  }),
};

mock.module("../../../cli/core/keychain.ts", () => ({ ...mockKeychain }));
mock.module("../../../cli/core/modelCache.ts", () => ({ ...mockModelCache }));
mock.module("../../../shared/questions/index.ts", () => ({ ...mockQuestions }));
mock.module("../../../cli/core/persistence.ts", () => ({ ...mockPersistence }));
mock.module("@inquirer/search", () => ({ ...mockSearch }));

// Do NOT mock the provider index — instead mock global fetch
// so the real dispatch and client code runs.

const optimizeModule = await import("../../../cli/core/optimise.ts");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clearAllMockCalls() {
  for (const fn of Object.values(mockKeychain)) {
    fn.mockClear();
  }
  for (const fn of Object.values(mockModelCache)) {
    fn.mockClear();
  }
  for (const fn of Object.values(mockQuestions)) {
    fn.mockClear();
  }
  for (const fn of Object.values(mockPersistence)) {
    fn.mockClear();
  }
}

let savedEnvKeys: Record<string, string | undefined> = {};
let savedPlatform: PropertyDescriptor | undefined;
let originalFetch: typeof globalThis.fetch | undefined;

function saveEnv(...keys: string[]) {
  for (const key of keys) {
    savedEnvKeys[key] = process.env[key];
  }
}

function restoreEnv() {
  for (const [key, value] of Object.entries(savedEnvKeys)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  savedEnvKeys = {};
}

function setPlatform(platform: NodeJS.Platform) {
  savedPlatform = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { value: platform });
}

function restorePlatform() {
  if (savedPlatform) {
    Object.defineProperty(process, "platform", savedPlatform);
    savedPlatform = undefined;
  }
}

function mockFetchOnce(responseBody: unknown, status = 200) {
  originalFetch = globalThis.fetch;
  globalThis.fetch = mock(async () =>
    new Response(JSON.stringify(responseBody), { status })
  ) as unknown as typeof fetch;
}

function restoreFetch() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = undefined;
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("resolveApiKey", () => {
  beforeEach(() => {
    clearAllMockCalls();
  });

  afterEach(() => {
    restoreEnv();
    restorePlatform();
  });

  it("prefers keychain on macOS", async () => {
    setPlatform("darwin");

    expect(await optimizeModule.resolveApiKey("openai")).toBe("from-keychain");
  });

  it("falls back to env var when keychain returns null", async () => {
    setPlatform("linux");

    saveEnv("OPENAI_API_KEY");
    process.env.OPENAI_API_KEY = "sk-from-env";

    expect(await optimizeModule.resolveApiKey("openai")).toBe("sk-from-env");
  });

  it("returns null for ollama (no apiKeyEnvVar)", async () => {
    expect(await optimizeModule.resolveApiKey("ollama")).toBeNull();
  });

  it("returns null when keychain and env var are both missing", async () => {
    setPlatform("darwin");
    mockKeychain.loadProviderKey.mockImplementation(async () => null);

    saveEnv("OPENAI_API_KEY");
    delete process.env.OPENAI_API_KEY;

    expect(await optimizeModule.resolveApiKey("openai")).toBeNull();
  });
});

describe("optimisePrompt", () => {
  beforeEach(() => {
    clearAllMockCalls();
  });

  afterEach(() => {
    restoreEnv();
    restoreFetch();
  });

  it("forwards the provider request and system prompt for ollama", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('{"response":"optimised prompt","done":true}\n'));
        controller.close();
      },
    });
    originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => new Response(stream, { status: 200 })) as unknown as typeof fetch;

    const text = await optimizeModule.optimisePrompt("make this better", {
      provider: "ollama",
      model: "deepseek-r1:latest",
    });
    expect(text).toBe("optimised prompt");
  });

  it("throws when no API key for paid provider", async () => {
    mockKeychain.loadProviderKey.mockImplementation(async () => null);

    saveEnv("OPENAI_API_KEY");
    delete process.env.OPENAI_API_KEY;

    await expect(
      optimizeModule.optimisePrompt("test", { provider: "openai", model: "gpt-4o" })
    ).rejects.toThrow(/No API key configured for openai/);
  });

  it("sends the SYSTEM_PROMPT as the system instruction", async () => {
    mockFetchOnce({
      output_text: "optimised text",
    });

    mockKeychain.loadProviderKey.mockImplementation(async () => "sk-valid");
    saveEnv("OPENAI_API_KEY");
    process.env.OPENAI_API_KEY = "sk-valid";

    await optimizeModule.optimisePrompt("hello", { provider: "openai", model: "gpt-4o" });

    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall?.[1]?.body ?? "{}");
    expect(body.instructions).toContain("Better-Cue");
  });
});
