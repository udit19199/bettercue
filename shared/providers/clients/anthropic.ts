import { DEFAULT_SYSTEM_PROMPT } from "../prompts";
import type { ListModelsRequest, OptimizeRequest, OptimizeResponse } from "../types";

const ANTHROPIC_BASE_URL = "https://api.anthropic.com";
const ANTHROPIC_ENDPOINT = `${ANTHROPIC_BASE_URL}/v1/messages`;
const ANTHROPIC_MODELS_ENDPOINT = `${ANTHROPIC_BASE_URL}/v1/models`;
const ANTHROPIC_VERSION = "2023-06-01";

function classifyAnthropicError(status: number, bodyText: string): Error {
  if (status === 401) {
    return new Error("Anthropic auth error: invalid or missing API key.");
  }
  if (status === 429) {
    return new Error("Anthropic rate limit reached. Try again shortly.");
  }
  if (status >= 500) {
    return new Error(`Anthropic server error (${status}). Try again shortly.`);
  }
  return new Error(`Anthropic error ${status}: ${bodyText.slice(0, 200)}`);
}

function requireApiKey(apiKey?: string | null): string {
  const normalized = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!normalized) {
    throw new Error("Missing Anthropic API key.");
  }
  return normalized;
}

export async function optimizeWithAnthropic(request: OptimizeRequest): Promise<OptimizeResponse> {
  const apiKey = requireApiKey(request.apiKey);
  const response = await fetch(request.baseUrl ?? ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: request.model,
      max_tokens: request.maxOutputTokens ?? 1024,
      system: request.system ?? DEFAULT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: request.prompt }],
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw classifyAnthropicError(response.status, bodyText);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const content = data.content;
  if (Array.isArray(content)) {
    const textBlock = content.find((block) => block?.type === "text" && typeof block.text === "string");
    if (textBlock?.text?.trim()) {
      return { text: textBlock.text.trim(), raw: data };
    }
  }

  throw new Error("Anthropic returned no text output.");
}

export async function listAnthropicModels(request: ListModelsRequest): Promise<string[]> {
  const apiKey = requireApiKey(request.apiKey);
  // Construct the models endpoint URL from baseUrl if provided
  const modelsUrl = request.baseUrl
    ? `${request.baseUrl.replace(/\/$/, "")}/v1/models`
    : ANTHROPIC_MODELS_ENDPOINT;

  const response = await fetch(modelsUrl, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    data?: Array<{ id?: string; type?: string }>;
  };

  if (!Array.isArray(data.data)) {
    return [];
  }

  // Filter to only include models (not other resource types) and sort by id
  return data.data
    .filter((item) => item.type === "model" && typeof item.id === "string" && !!item.id)
    .map((item) => item.id as string)
    .sort();
}
