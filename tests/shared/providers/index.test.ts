import { afterEach, describe, expect, it, mock } from "bun:test";

// ─── Fetch mocking ───────────────────────────────────────────────────────────
// Mock global fetch so the real dispatch and client code is exercised
// without making real HTTP calls.

let originalFetch: typeof globalThis.fetch | undefined;

function mockFetch(responseBody: unknown, status = 200) {
  originalFetch = globalThis.fetch;
  globalThis.fetch = mock(async () =>
    new Response(JSON.stringify(responseBody), { status })
  ) as unknown as typeof fetch;
}

function mockOllamaStream(chunks: string[]) {
  originalFetch = globalThis.fetch;
  const encoder = new TextEncoder();
  globalThis.fetch = mock(async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });
    return new Response(stream, { status: 200 });
  }) as unknown as typeof fetch;
}

function restoreFetch() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = undefined;
  }
}

const {
  optimizeWithProvider,
  listProviderModels,
  generateQuestionsWithProvider,
  CORE_PROVIDER_IDS,
  CORE_PROVIDERS,
  DEFAULT_PROVIDER,
  DEFAULT_SYSTEM_PROMPT,
  getSystemPrompt,
} = await import("../../../shared/providers/index");

describe("CORE_PROVIDER_IDS", () => {
  it("includes all four providers", () => {
    expect(CORE_PROVIDER_IDS).toContain("ollama");
    expect(CORE_PROVIDER_IDS).toContain("openai");
    expect(CORE_PROVIDER_IDS).toContain("anthropic");
    expect(CORE_PROVIDER_IDS).toContain("google");
  });
});

describe("CORE_PROVIDERS", () => {
  it("ollama has requiresApiKey false", () => {
    expect(CORE_PROVIDERS.ollama.requiresApiKey).toBe(false);
    expect(CORE_PROVIDERS.ollama.apiKeyEnvVar).toBeNull();
  });

  it("paid providers have requiresApiKey true", () => {
    expect(CORE_PROVIDERS.openai.requiresApiKey).toBe(true);
    expect(CORE_PROVIDERS.anthropic.requiresApiKey).toBe(true);
    expect(CORE_PROVIDERS.google.requiresApiKey).toBe(true);
  });
});

describe("DEFAULT_PROVIDER", () => {
  it("is ollama", () => {
    expect(DEFAULT_PROVIDER).toBe("ollama");
  });
});

describe("DEFAULT_SYSTEM_PROMPT / getSystemPrompt", () => {
  it("exports DEFAULT_SYSTEM_PROMPT", () => {
    expect(DEFAULT_SYSTEM_PROMPT).toBeTruthy();
    expect(DEFAULT_SYSTEM_PROMPT).toContain("Better-Cue");
  });

  it("getSystemPrompt is re-exported correctly", () => {
    expect(getSystemPrompt()).toBe(DEFAULT_SYSTEM_PROMPT);
  });
});

describe("optimizeWithProvider", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("dispatches to ollama client (streaming NDJSON)", async () => {
    mockOllamaStream([
      '{"response":"optim","done":false}\n',
      '{"response":"ised","done":false}\n',
      '{"response":" output","done":true}\n',
    ]);

    const result = await optimizeWithProvider({
      provider: "ollama",
      prompt: "hello",
      model: "llama3",
    });
    expect(result.text).toBe("optimised output");
  });

  it("dispatches to openai client (responses API)", async () => {
    mockFetch({
      output_text: "optimised by openai",
    });

    const result = await optimizeWithProvider({
      provider: "openai",
      prompt: "hello",
      model: "gpt-4o",
      apiKey: "sk-test",
    });
    expect(result.text).toBe("optimised by openai");
  });

  it("dispatches to anthropic client", async () => {
    mockFetch({
      content: [{ type: "text", text: "optimised by anthropic" }],
    });

    const result = await optimizeWithProvider({
      provider: "anthropic",
      prompt: "hello",
      model: "claude-3-5-sonnet",
      apiKey: "sk-test",
    });
    expect(result.text).toBe("optimised by anthropic");
  });

  it("dispatches to google client", async () => {
    mockFetch({
      candidates: [{ content: { parts: [{ text: "optimised by gemini" }] } }],
    });

    const result = await optimizeWithProvider({
      provider: "google",
      prompt: "hello",
      model: "gemini-pro",
      apiKey: "test-key",
    });
    expect(result.text).toBe("optimised by gemini");
  });

  it("throws for unsupported provider", async () => {
    await expect(
      optimizeWithProvider({
        provider: "unknown" as any,
        prompt: "hello",
        model: "model",
      })
    ).rejects.toThrow(/Unsupported provider/);
  });
});

describe("listProviderModels", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("returns ollama models from /api/tags", async () => {
    mockFetch({ models: [{ name: "llama3" }, { name: "deepseek-r1" }] });

    const models = await listProviderModels({ provider: "ollama" });
    expect(models).toContain("llama3");
    expect(models).toContain("deepseek-r1");
  });

  it("returns openai models from /v1/models", async () => {
    mockFetch({
      data: [
        { id: "gpt-4o", object: "model" },
        { id: "gpt-4o-mini", object: "model" },
      ],
    });

    const models = await listProviderModels({ provider: "openai", apiKey: "sk-test" });
    expect(models).toContain("gpt-4o");
    expect(models).toContain("gpt-4o-mini");
  });

  it("throws for unsupported provider", async () => {
    await expect(
      listProviderModels({ provider: "unknown" as any })
    ).rejects.toThrow(/Unsupported provider/);
  });
});

describe("generateQuestionsWithProvider", () => {
  afterEach(() => {
    restoreFetch();
  });

  it("generates and parses questions from optimize response", async () => {
    mockOllamaStream([
      JSON.stringify({
        response: JSON.stringify({
          questions: [
            { id: "audience", question: "Who is the target?", type: "text" },
          ],
        }),
        done: true,
      }) + "\n",
    ]);

    const result = await generateQuestionsWithProvider({
      provider: "ollama",
      prompt: "Write a story",
      model: "llama3",
    });

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]!.id).toBe("audience");
  });

  it("includes raw response when available", async () => {
    mockFetch({
      output_text: JSON.stringify({
        questions: [
          { id: "audience", question: "Who is the target?", type: "text" },
        ],
      }),
    });

    const result = await generateQuestionsWithProvider({
      provider: "openai",
      prompt: "Hello",
      model: "gpt-4o",
      apiKey: "sk-test",
    });

    expect(result.questions).toHaveLength(1);
    expect(result.raw).toBeDefined();
  });
});
