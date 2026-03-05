/**
 * OpenAI provider adapter.
 *
 * Uses the Responses API (POST /v1/responses) — OpenAI's recommended
 * replacement for Chat Completions for all new projects.
 *
 * Key differences from Chat Completions:
 *   - Endpoint:  /v1/responses  (was /v1/chat/completions)
 *   - Input:     `instructions` (system) + `input` (user prompt)
 *   - Output:    `response.output_text`  (was choices[0].message.content)
 *   - Privacy:   `store: false` — no server-side retention of prompts
 *   - Cost:      ~40–80% better cache utilisation vs Chat Completions
 *
 * Error classification:
 *   - 401 → auth error (bad/missing key)
 *   - 429 → rate limit
 *   - 5xx → transient server error
 */

import type { ProviderAdapter, RewriteOptions, RewriteResult } from "./provider";
import { estimateTokens, heuristicTokens } from "../tokens/estimator";

const RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";

// ─── System instruction templates per preset ─────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  concise:
    "You are a senior prompt engineer. Rewrite the user's prompt to be as concise and direct as possible while fully preserving intent. Remove filler, ambiguity, and redundancy. Output only the improved prompt — no explanation.",
  precision:
    "You are a senior prompt engineer. Rewrite the user's prompt to maximise specificity and reduce ambiguity: add relevant constraints, explicit output format instructions, and clear scope boundaries. Output only the improved prompt — no explanation.",
  creative:
    "You are a senior prompt engineer with a flair for engaging language. Rewrite the user's prompt to be vivid, imaginative, and compelling while preserving the core intent. Output only the improved prompt — no explanation.",
};

const DEFAULT_SYSTEM = SYSTEM_PROMPTS.concise;

// ─── Error classification ─────────────────────────────────────────────────────

function classifyError(status: number, body: string): Error {
  if (status === 401)
    return new Error("OpenAI auth error: invalid or missing API key. Check Settings.");
  if (status === 429)
    return new Error("OpenAI rate limit reached. Please wait a moment and try again.");
  if (status >= 500)
    return new Error(`OpenAI server error (${status}). Try again shortly.`);
  return new Error(`OpenAI error ${status}: ${body.slice(0, 200)}`);
}

// ─── Responses API call ───────────────────────────────────────────────────────

async function callResponsesAPI(
  apiKey: string,
  model: string,
  instructions: string,
  input: string,
  maxOutputTokens: number
): Promise<string> {
  const body = {
    model,
    instructions,
    input,
    max_output_tokens: maxOutputTokens,
    // Do NOT retain prompts server-side — privacy default.
    store: false,
  };

  const res = await fetch(RESPONSES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw classifyError(res.status, text);
  }

  const data = await res.json();

  // Primary path: output_text helper (available for text-only responses)
  if (typeof data?.output_text === "string") return data.output_text;

  // Fallback: walk output items for the first message content
  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (item?.type === "message" && Array.isArray(item.content)) {
        for (const block of item.content) {
          if (block?.type === "output_text" && typeof block.text === "string") {
            return block.text;
          }
        }
      }
    }
  }

  throw new Error("OpenAI Responses API: could not extract output text from response.");
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

const openaiAdapter: ProviderAdapter = {
  id: "openai",
  displayName: "OpenAI",

  supportsModel: (model: string) => !!model,

  // Synchronous heuristic estimate (used by UI before async precise count)
  estimateTokens: (text: string) => heuristicTokens(text),

  rewritePrompt: async (
    original: string,
    model: string,
    apiKey: string | null,
    options?: RewriteOptions
  ): Promise<RewriteResult> => {
    if (!apiKey) throw new Error("Missing OpenAI API key. Open Settings to add one.");

    const preset = options?.preset ?? "concise";
    const instructions = SYSTEM_PROMPTS[preset] ?? DEFAULT_SYSTEM;
    const maxOutputTokens = options?.maxTokens ?? 512;
    const usePrecise = options?.preciseTokens ?? false;

    const optimizedPrompt = await callResponsesAPI(
      apiKey,
      model || "gpt-4o",
      instructions,
      original,
      maxOutputTokens
    );

    // Token estimate on the optimized output
    const tokenEstimate = await estimateTokens(optimizedPrompt.trim(), usePrecise);

    const result: RewriteResult = {
      optimizedPrompt: optimizedPrompt.trim(),
      notes: `Rewritten via OpenAI Responses API (model: ${model}, preset: ${preset}, store: false)`,
      tokenEstimate,
      warnings: [],
    };

    return result;
  },
};

export default openaiAdapter;
