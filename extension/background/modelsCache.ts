import type { CachedModels } from "@shared/providers";

function getCacheKey(providerId: string): string {
  return `models.${providerId}`;
}

function isCachedModels(value: unknown): value is CachedModels {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { items?: unknown }).items) &&
    typeof (value as { fetchedAt?: unknown }).fetchedAt === "number"
  );
}

export async function readModelsCache(providerId: string): Promise<CachedModels | null> {
  const cacheKey = getCacheKey(providerId);
  const result = await new Promise<Record<string, unknown>>((resolve) => {
    chrome.storage.local.get([cacheKey], (items) => resolve(items || {}));
  });

  const cached = result[cacheKey];
  return isCachedModels(cached) ? cached : null;
}

export async function writeModelsCache(providerId: string, models: string[], fetchedAt: number): Promise<void> {
  const cacheKey = getCacheKey(providerId);
  await new Promise<void>((resolve) => {
    chrome.storage.local.set({ [cacheKey]: { items: models, fetchedAt } }, resolve);
  });
}
