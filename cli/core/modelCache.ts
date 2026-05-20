import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { CoreProviderId } from "../../shared/providers/index.ts";

type CachedModels = {
    items: string[];
    fetchedAt: number;
};

type CacheState = Record<string, CachedModels>;

function getCacheFile(): string {
    return resolve(process.env.HOME ?? ".", ".bettercue", "models-cache.json");
}

function normalizeBaseUrl(baseUrl?: string): string {
    return typeof baseUrl === "string" ? baseUrl.trim().replace(/\/$/, "") : "";
}

function makeCacheKey(provider: CoreProviderId, baseUrl?: string): string {
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
    return normalizedBaseUrl ? `${provider}:${normalizedBaseUrl}` : provider;
}

async function readCache(): Promise<CacheState> {
    const cacheFile = getCacheFile();
    if (!existsSync(cacheFile)) {
        return {};
    }

    try {
        const raw = await readFile(cacheFile, "utf8");
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return {};
        }

        const cache: CacheState = {};
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
            if (!value || typeof value !== "object" || Array.isArray(value)) {
                continue;
            }

            const items = (value as { items?: unknown }).items;
            const fetchedAt = (value as { fetchedAt?: unknown }).fetchedAt;
            if (!Array.isArray(items) || typeof fetchedAt !== "number") {
                continue;
            }

            const normalizedItems = items.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
            if (!normalizedItems.length) {
                continue;
            }

            cache[key] = { items: normalizedItems, fetchedAt };
        }

        return cache;
    } catch {
        return {};
    }
}

async function writeCache(cache: CacheState): Promise<void> {
    const cacheFile = getCacheFile();
    await mkdir(dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

export async function loadCachedModels(provider: CoreProviderId, baseUrl?: string): Promise<string[] | null> {
    const cache = await readCache();
    const entry = cache[makeCacheKey(provider, baseUrl)];
    return entry?.items ?? null;
}

export async function saveCachedModels(provider: CoreProviderId, models: string[], baseUrl?: string): Promise<void> {
    const normalizedItems = models.map((model) => model.trim()).filter((model) => model.length > 0);
    if (!normalizedItems.length) {
        return;
    }

    const cache = await readCache();
    cache[makeCacheKey(provider, baseUrl)] = {
        items: normalizedItems,
        fetchedAt: Date.now(),
    };
    await writeCache(cache);
}

export async function clearCachedModels(provider: CoreProviderId, baseUrl?: string): Promise<void> {
    const cache = await readCache();
    delete cache[makeCacheKey(provider, baseUrl)];
    await writeCache(cache);
}
