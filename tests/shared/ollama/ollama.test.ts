import { describe, expect, it, mock } from "bun:test";
import { generateOllamaPrompt, listOllamaModels } from "../../../shared/ollama/index";
import { DEFAULT_SYSTEM_PROMPT } from "../../../shared/providers/prompts";

describe("generateOllamaPrompt", () => {
  it("concatenates streamed chunks across chunk boundaries", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('{"response":"hel'));
        controller.enqueue(encoder.encode('lo","done":false}\n{"response":" wor'));
        controller.enqueue(encoder.encode('ld","done":true}\n'));
        controller.close();
      },
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (mock(async () => new Response(stream, { status: 200 })) as any) as typeof fetch;

    try {
      const result = await generateOllamaPrompt({ prompt: "hello", system: DEFAULT_SYSTEM_PROMPT });
      expect(result.text).toBe("hello world");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws a useful error for HTTP failures", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (mock(async () => new Response("not available", { status: 503 })) as any) as typeof fetch;

    try {
      await expect(generateOllamaPrompt({ prompt: "hello" })).rejects.toThrow(
        /Ollama server error \(503\)/
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("listOllamaModels", () => {
  it("returns model names from /api/tags", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (mock(async () =>
      new Response(JSON.stringify({ models: [{ name: "llama3" }, { name: "deepseek-r1" }] }), { status: 200 })
    ) as any) as typeof fetch;

    try {
      const models = await listOllamaModels();
      expect(models).toContain("llama3");
      expect(models).toContain("deepseek-r1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns empty array on HTTP error", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (mock(async () => new Response("error", { status: 500 })) as any) as typeof fetch;

    try {
      const models = await listOllamaModels();
      expect(models).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns empty array on fetch error", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (mock(async () => { throw new Error("connection refused"); }) as any) as typeof fetch;

    try {
      const models = await listOllamaModels();
      expect(models).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
