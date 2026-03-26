/*
 * Background message orchestration for the extension.
 *
 * This module owns message validation, adapter lookup, API-key loading,
 * model-list caching, and response normalization. Chrome runtime plumbing
 * stays in `background.ts`.
 */

import type { ProviderAdapter, RewriteOptions } from "../shared/providers/provider";

export type BackgroundMessage =
  | {
      type: "rewrite";
      payload: {
        adapterId: string;
        model: string;
        original: string;
        options?: RewriteOptions;
      };
    }
  | {
      type: "list-models";
      payload: {
        provider: string;
      };
    };

export type BackgroundReply =
  | { ok: true; result: unknown }
  | { ok: true; models: string[] }
  | { ok: false; error: string };

type CachedModels = {
  items: string[];
  fetchedAt: number;
};

export type BackgroundDeps = {
  getAdapter(id: string): ProviderAdapter | null;
  loadApiKey(providerId: string): Promise<string | null>;
  readModelsCache(providerId: string): Promise<CachedModels | null>;
  writeModelsCache(providerId: string, models: string[], fetchedAt: number): Promise<void>;
  now(): number;
};

const MODELS_CACHE_TTL_MS = 60 * 60 * 1000;

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid or missing ${field}.`);
  }

  return value;
}

function isFresh(entry: CachedModels, now: number): boolean {
  return now - entry.fetchedAt < MODELS_CACHE_TTL_MS;
}

/**
 * Create a background message flow.
 * @param deps Injected ports for adapter lookup, key storage, cache, and time.
 */
export function createBackgroundMessageFlow(deps: BackgroundDeps) {
  async function handleRewrite(payload: Record<string, unknown>): Promise<BackgroundReply> {
    const adapterId = readString(payload.adapterId, "adapterId");
    const model = readString(payload.model, "model");
    const original = readString(payload.original, "original");
    const options = isObject(payload.options) ? (payload.options as RewriteOptions) : undefined;

    const adapter = deps.getAdapter(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    const apiKey = await deps.loadApiKey(adapterId);
    const result = await adapter.rewritePrompt(original, model, apiKey, options);
    return { ok: true, result };
  }

  async function handleListModels(payload: Record<string, unknown>): Promise<BackgroundReply> {
    const provider = readString(payload.provider, "provider");
    const adapter = deps.getAdapter(provider);
    if (!adapter) {
      throw new Error(`Adapter not found: ${provider}`);
    }

    if (!adapter.listModels) {
      throw new Error("Listing not supported for this provider");
    }

    const now = deps.now();
    const cached = await deps.readModelsCache(provider);
    if (cached && isFresh(cached, now)) {
      return { ok: true, models: cached.items };
    }

    const apiKey = await deps.loadApiKey(provider);
    const models = await adapter.listModels(apiKey);
    await deps.writeModelsCache(provider, models, now);

    return { ok: true, models };
  }

  return {
    async handle(message: unknown): Promise<BackgroundReply> {
      try {
        if (!isObject(message)) {
          throw new Error("Invalid background message.");
        }

        if (message.type === "rewrite") {
          if (!isObject(message.payload)) {
            throw new Error("Invalid or missing payload.");
          }
          return await handleRewrite(message.payload as Record<string, unknown>);
        }

        if (message.type === "list-models") {
          if (!isObject(message.payload)) {
            throw new Error("Invalid or missing payload.");
          }
          return await handleListModels(message.payload as Record<string, unknown>);
        }

        throw new Error(`Unsupported background message: ${String(message.type)}`);
      } catch (error) {
        return { ok: false, error: normalizeError(error) };
      }
    },
  };
}
