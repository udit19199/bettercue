import type { ProviderAdapter, RewriteOptions, RewriteResult } from "./provider";

const OPENAI_HOST = "https://api.openai.com";

function simpleTokenEstimate(text: string) {
  return Math.max(1, Math.round(text.length / 4));
}

async function callOpenAIChat(apiKey: string, model: string, system: string, userPrompt: string, maxTokens = 256) {
  const url = `${OPENAI_HOST}/v1/chat/completions`;
  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt }
    ],
    max_tokens: maxTokens,
    temperature: 0.2
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }

  const data = await res.json();
  // Normalize: expect first choice message content
  const content = data?.choices?.[0]?.message?.content ?? "";
  return content;
}

const openaiAdapter: ProviderAdapter = {
  id: "openai",
  displayName: "OpenAI",
  supportsModel: (model: string) => !!model,
  estimateTokens: (text: string) => simpleTokenEstimate(text),
  rewritePrompt: async (original: string, model: string, apiKey: string | null, options?: RewriteOptions) => {
    if (!apiKey) {
      throw new Error("Missing OpenAI API key");
    }

    const preset = options?.preset ?? "concise";
    const system = `You are a prompt-engineer. Rewrite the user's prompt to be explicit, concise, and preserve intent. Preset: ${preset}. Output only the improved prompt.`;
    const userPrompt = original;
    const maxTokens = options?.maxTokens ?? 256;
    const content = await callOpenAIChat(apiKey, model, system, userPrompt, maxTokens);

    const tokenEstimate = simpleTokenEstimate(content);
    const result: RewriteResult = {
      optimizedPrompt: content.trim(),
      notes: "Rewritten by OpenAI adapter",
      tokenEstimate,
      warnings: []
    };

    return result;
  }
};

export default openaiAdapter;
