import { describe, expect, it, mock } from "bun:test";
import { generateOllamaPrompt, SYSTEM_PROMPT } from "../../shared/ollama/index";

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
      const result = await generateOllamaPrompt({ prompt: "hello", system: SYSTEM_PROMPT });
      expect(result).toBe("hello world");
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
