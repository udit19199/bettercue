import { afterEach, describe, expect, it, mock } from "bun:test";
import { clearPreciseTokensCache, getPreciseTokensSetting } from "./preciseTokens";

mock.module("./keys", () => ({
  loadPreciseTokensSetting: mock(async () => true),
}));

afterEach(() => {
  clearPreciseTokensCache();
});

describe("precise tokens cache", () => {
  it("loads the setting once and caches it", async () => {
    const first = await getPreciseTokensSetting();
    const second = await getPreciseTokensSetting();

    expect(first).toBe(true);
    expect(second).toBe(true);
  });
});
