import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

let homeDir = resolve(process.cwd(), "tmp-home");

async function loadFreshCacheModule() {
    const cachePath = `./modelCache.ts?${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return await import(cachePath);
}

async function withTempHome<T>(fn: () => Promise<T>): Promise<T> {
    const previousHome = process.env.HOME;
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    homeDir = resolve(process.cwd(), `tmp-home-${uniqueSuffix}`);
    process.env.HOME = homeDir;
    await mkdir(homeDir, { recursive: true });

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

afterEach(async () => {
    await rm(homeDir, { recursive: true, force: true });
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
});
