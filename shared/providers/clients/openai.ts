import { DEFAULT_SYSTEM_PROMPT } from "../prompts";
import type { ListModelsRequest, OptimizeRequest, OptimizeResponse } from "../types";

const RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";

function classifyOpenAIError(status: number, bodyText: string): Error {
  if (status === 401) {
    return new Error("OpenAI auth error: invalid or missing API key.");
  }
  if (status === 429) {
    return new Error("OpenAI rate limit reached. Try again shortly.");
  }
  if (status >= 500) {
    return new Error(`OpenAI server error (${status}). Try again shortly.`);
  }
  return new Error(`OpenAI error ${status}: ${bodyText.slice(0, 200)}`);
}

function requireApiKey(apiKey?: string | null): string {
  const normalized = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!normalized) {
    throw new Error("Missing OpenAI API key.");
  }
  return normalized;
}

export async function optimizeWithOpenAI(request: OptimizeRequest): Promise<OptimizeResponse> {
  const apiKey = requireApiKey(request.apiKey);
  const response = await fetch(request.baseUrl ?? RESPONSES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      instructions: request.system ?? DEFAULT_SYSTEM_PROMPT,
      input: request.prompt,
      ...(typeof request.maxOutputTokens === "number" ? { max_output_tokens: request.maxOutputTokens } : {}),
      store: false,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw classifyOpenAIError(response.status, bodyText);
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return { text: data.output_text.trim(), raw: data };
  }

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item?.type === "message" && Array.isArray(item.content)) {
        for (const block of item.content) {
          if (block?.type === "output_text" && typeof block.text === "string" && block.text.trim()) {
            return { text: block.text.trim(), raw: data };
          }
        }
      }
    }
  }

  throw new Error("OpenAI returned no text output.");
}

export async function listOpenAIModels(request: ListModelsRequest): Promise<string[]> {
  const apiKey = requireApiKey(request.apiKey);
  const response = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    data?: Array<{ id?: string }>;
  };

  if (!Array.isArray(data.data)) {
    return [];
  }

  return data.data.map((item) => item.id).filter((id): id is string => typeof id === "string" && !!id);
}
