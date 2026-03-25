import { DEFAULT_SYSTEM_PROMPT } from "../prompts";
import type { OptimizeRequest, OptimizeResponse } from "../types";

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
  };

  const candidate = Array.isArray(data.candidates) ? data.candidates[0] : null;
  const parts = candidate?.content?.parts;
  if (Array.isArray(parts)) {
    const textPart = parts.find((part) => typeof part?.text === "string" && part.text.trim());
    if (textPart?.text?.trim()) {
      return { text: textPart.text.trim(), raw: data };
    }
  }

  throw new Error("Google returned no text output.");
}
