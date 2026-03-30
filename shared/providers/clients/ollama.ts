import {
  DEFAULT_OLLAMA_GENERATE_URL,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_TAGS_URL,
  generateOllamaPrompt,
  listOllamaModels,
} from "../../ollama/index";
import { DEFAULT_SYSTEM_PROMPT } from "../prompts";
import type { ListModelsRequest, OptimizeRequest, OptimizeResponse } from "../types";

export async function optimizeWithOllama(request: OptimizeRequest): Promise<OptimizeResponse> {
  const text = await generateOllamaPrompt({
    url: request.baseUrl ?? DEFAULT_OLLAMA_GENERATE_URL,
    model: request.model || DEFAULT_OLLAMA_MODEL,
    prompt: request.prompt,
    system: request.system ?? DEFAULT_SYSTEM_PROMPT,
  });

  return { text };
}

export async function listOllamaProviderModels(request: ListModelsRequest): Promise<string[]> {
  // If a custom baseUrl is provided, construct the tags endpoint URL from it
  // Otherwise use the default tags URL
  const tagsUrl = request.baseUrl
    ? `${request.baseUrl.replace(/\/$/, "")}/api/tags`
    : DEFAULT_OLLAMA_TAGS_URL;
  return await listOllamaModels(tagsUrl);
}
