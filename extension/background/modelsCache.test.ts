import { afterEach, describe, expect, it } from "bun:test";
import { readModelsCache, writeModelsCache } from "./modelsCache";

const storage = {
  data: {} as Record<string, unknown>,
};

globalThis.chrome = {
  storage: {
    local: {
      get: (keys: string[], cb: (items: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in storage.data) {
            result[key] = storage.data[key];
          }
        }
        cb(result);
      },
      set: (items: Record<string, unknown>, cb: () => void) => {
        Object.assign(storage.data, items);
        cb();
      },
    },
  },
} as typeof chrome;

afterEach(() => {
  storage.data = {};
});

describe("models cache", () => {
  it("reads and writes cached models", async () => {
    await writeModelsCache("openai", ["a", "b"], 123);
    expect(await readModelsCache("openai")).toEqual({ items: ["a", "b"], fetchedAt: 123 });
  });
});
