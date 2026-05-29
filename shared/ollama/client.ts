import { DEFAULT_SYSTEM_PROMPT } from "../providers/prompts";

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

export const DEFAULT_OLLAMA_GENERATE_URL = `${DEFAULT_OLLAMA_BASE_URL}/api/generate`;
export const DEFAULT_OLLAMA_TAGS_URL = `${DEFAULT_OLLAMA_BASE_URL}/api/tags`;
export const DEFAULT_OLLAMA_MODEL = "deepseek-r1:latest";

export type OllamaGenerateOptions = {
  prompt: string;
  model?: string;
  system?: string;
  url?: string;
  signal?: AbortSignal;
};

function classifyHttpError(url: string, status: number, bodyText: string): Error {
  if (status === 404) {
    return new Error(`Ollama endpoint not found at ${url}. Is Ollama running on the expected port?`);
  }
  if (status >= 500) {
    return new Error(`Ollama server error (${status}) at ${url}. Try again shortly.`);
  }
  return new Error(`Ollama error ${status} at ${url}: ${bodyText.slice(0, 200)}`);
}

async function readOllamaStream(body: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";
  let output = "";
  let sawDone = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf("\n");

        if (!line) continue;

        const data = JSON.parse(line) as { response?: string; done?: boolean; error?: string };
        if (typeof data.error === "string" && data.error) {
          throw new Error(`Ollama error: ${data.error}`);
        }
        if (typeof data.response === "string") {
          output += data.response;
        }
        if (data.done) {
          sawDone = true;
          return output.trim();
        }
      }
    }

    const tail = `${buffer}${decoder.decode()}`.trim();
    if (tail) {
      const data = JSON.parse(tail) as { response?: string; done?: boolean; error?: string };
      if (typeof data.error === "string" && data.error) {
        throw new Error(`Ollama error: ${data.error}`);
      }
      if (typeof data.response === "string") {
        output += data.response;
      }
      if (data.done) {
        sawDone = true;
      }
    }

    if (!output.trim() && !sawDone) {
      throw new Error("Ollama returned an empty response.");
    }

    return output.trim();
  } finally {
    reader.releaseLock();
  }
}

export async function generateOllamaPrompt(options: OllamaGenerateOptions): Promise<string> {
  const url = options.url ?? DEFAULT_OLLAMA_GENERATE_URL;
  const controller = new AbortController();
  const signal = options.signal;

  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", forwardAbort, { once: true });
    }
  }

  const body = {
    model: options.model ?? DEFAULT_OLLAMA_MODEL,
    prompt: options.prompt,
    system: options.system ?? DEFAULT_SYSTEM_PROMPT,
    stream: true,
  };

  const timeout = globalThis.setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw classifyHttpError(url, response.status, text);
    }

    if (!response.body) {
      throw new Error(`Ollama returned no response body from ${url}.`);
    }

    return await readOllamaStream(response.body);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timed out connecting to Ollama at ${url}.`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Ollama returned malformed stream data from ${url}.`);
    }
    if (error instanceof TypeError) {
      throw new Error(`Unable to connect to Ollama at ${url}. Is it running?`);
    }
    throw error;
  } finally {
    signal?.removeEventListener("abort", forwardAbort);
    clearTimeout(timeout);
  }
}

export async function listOllamaModels(url = DEFAULT_OLLAMA_TAGS_URL): Promise<string[]> {
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) return [];

    const data = (await response.json()) as { models?: Array<{ name?: string }> };
    if (!Array.isArray(data.models)) return [];

    return data.models.map((model) => model.name).filter((name): name is string => !!name);
  } catch {
    return [];
  }
}
