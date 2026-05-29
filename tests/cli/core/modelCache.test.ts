import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const tempDirs = new Set<string>();

async function loadFreshCacheModule() {
    const cachePath = `../../../cli/core/modelCache.ts?t=${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return await import(cachePath);
}

async function withTempHome<T>(fn: () => Promise<T>): Promise<T> {
    const previousHome = process.env.HOME;
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tempDir = resolve(process.cwd(), `tmp-home-${uniqueSuffix}`);
    process.env.HOME = tempDir;
    tempDirs.add(tempDir);
    await mkdir(tempDir, { recursive: true });

    try {
        return await fn();
    } finally {
        if (previousHome === undefined) {
            delete process.env.HOME;
        } else {
            process.env.HOME = previousHome;
        }
    }
}

beforeEach(() => {
    tempDirs.clear();
});

afterEach(async () => {
    for (const dir of tempDirs) {
        await rm(dir, { recursive: true, force: true });
    }
    tempDirs.clear();
});

describe("model cache", () => {
    it("persists cached models across reads", async () => {
        await withTempHome(async () => {
            const cache = await loadFreshCacheModule();
            await cache.saveCachedModels("openai", ["gpt-4.1-mini", "gpt-4o-mini"]);

            const cached = await cache.loadCachedModels("openai");
            expect(cached).toEqual(["gpt-4.1-mini", "gpt-4o-mini"]);
        });
    });

    it("separates cache entries by base URL", async () => {
        await withTempHome(async () => {
            const cache = await loadFreshCacheModule();
            await cache.saveCachedModels("ollama", ["model-a"], "http://localhost:11434");
            await cache.saveCachedModels("ollama", ["model-b"], "http://127.0.0.1:11434");

            expect(await cache.loadCachedModels("ollama", "http://localhost:11434")).toEqual(["model-a"]);
            expect(await cache.loadCachedModels("ollama", "http://127.0.0.1:11434")).toEqual(["model-b"]);
        });
    });

    it("returns null for unknown provider", async () => {
        await withTempHome(async () => {
            const cache = await loadFreshCacheModule();
            const cached = await cache.loadCachedModels("openai");
            expect(cached).toBeNull();
        });
    });

    it("clears cached models for a provider", async () => {
        await withTempHome(async () => {
            const cache = await loadFreshCacheModule();
            await cache.saveCachedModels("openai", ["gpt-4o"]);
            await cache.clearCachedModels("openai");

            const cached = await cache.loadCachedModels("openai");
            expect(cached).toBeNull();
        });
    });
});
