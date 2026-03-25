import {
  DEFAULT_OLLAMA_GENERATE_URL,
  DEFAULT_OLLAMA_MODEL,
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
  return await listOllamaModels(request.baseUrl);
}
