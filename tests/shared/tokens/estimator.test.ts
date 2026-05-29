import { describe, expect, it } from "bun:test";
import { heuristicTokens } from "../../../shared/tokens/estimator";

describe("heuristicTokens", () => {
  it("returns 1 for empty string", () => {
    expect(heuristicTokens("")).toBe(1);
  });

  it("returns 1 for very short text", () => {
    expect(heuristicTokens("hi")).toBe(1);
  });

  it("returns ~length/4 for standard-length text", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    // length = 43, 43/4 ≈ 10.75 → 11
    expect(heuristicTokens(text)).toBe(11);
  });

  it("rounds to nearest integer", () => {
    expect(heuristicTokens("abc")).toBe(1);
    expect(heuristicTokens("abcdef")).toBe(2);
    expect(heuristicTokens("abcdefg")).toBe(2);
    expect(heuristicTokens("abcdefgh")).toBe(2);
  });

  it("handles multi-line text", () => {
    const text = "line1\nline2\nline3";
    expect(heuristicTokens(text)).toBe(4);
  });

  it("handles unicode characters", () => {
    const text = "Hello, 世界! øæå ñç";
    expect(heuristicTokens(text)).toBe(4);
  });
});
