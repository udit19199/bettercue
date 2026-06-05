import { DEFAULT_SYSTEM_PROMPT } from "../prompts";
import type { ListModelsRequest, OptimizeRequest, OptimizeResponse, Usage } from "../types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function classifyGoogleError(status: number, bodyText: string): Error {
  if (status === 401 || status === 403) {
    return new Error("Google auth error: invalid or missing API key.");
  }
  if (status === 429) {
    return new Error("Google rate limit reached. Try again shortly.");
  }
  if (status >= 500) {
    return new Error(`Google server error (${status}). Try again shortly.`);
  }
  return new Error(`Google error ${status}: ${bodyText.slice(0, 200)}`);
}

function requireApiKey(apiKey?: string | null): string {
  const normalized = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!normalized) {
    throw new Error("Missing Google API key.");
  }
  return normalized;
}

export async function optimizeWithGoogle(request: OptimizeRequest): Promise<OptimizeResponse> {
  const apiKey = requireApiKey(request.apiKey);
  const baseUrl = request.baseUrl ?? GEMINI_BASE_URL;
  const url = `${baseUrl}/${encodeURIComponent(request.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: request.system ?? DEFAULT_SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: request.prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw classifyGoogleError(response.status, bodyText);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  // Extract token usage from the response
  const usage: Usage | undefined = data.usageMetadata
    ? { inputTokens: data.usageMetadata.promptTokenCount ?? 0, outputTokens: data.usageMetadata.candidatesTokenCount ?? 0 }
    : undefined;

  const candidate = Array.isArray(data.candidates) ? data.candidates[0] : null;
  const parts = candidate?.content?.parts;
  if (Array.isArray(parts)) {
    const textPart = parts.find((part) => typeof part?.text === "string" && part.text.trim());
    if (textPart?.text?.trim()) {
      return { text: textPart.text.trim(), usage, raw: data };
    }
  }

  throw new Error("Google returned no text output.");
}

export async function listGoogleModels(request: ListModelsRequest): Promise<string[]> {
  const apiKey = requireApiKey(request.apiKey);
  // Construct the models endpoint URL from baseUrl if provided
  const baseUrl = request.baseUrl?.replace(/\/$/, "") ?? GEMINI_BASE_URL;
  const url = `${baseUrl}?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    models?: Array<{
      name?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  if (!Array.isArray(data.models)) {
    return [];
  }

  // Filter to models that support generateContent (text generation)
  // and extract just the model name (strip "models/" prefix)
  return data.models
    .filter((model) => {
      const supportsGenerate = model.supportedGenerationMethods?.includes("generateContent");
      return supportsGenerate && typeof model.name === "string" && !!model.name;
    })
    .map((model) => {
      // Model names come as "models/gemini-pro", we want just "gemini-pro"
      const name = model.name as string;
      return name.startsWith("models/") ? name.slice(7) : name;
    })
    .sort();
}
