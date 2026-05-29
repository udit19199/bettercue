import { describe, expect, it } from "bun:test";
import { DEFAULT_SYSTEM_PROMPT, getSystemPrompt, SYSTEM_PROMPTS } from "../../../shared/providers/prompts";

describe("DEFAULT_SYSTEM_PROMPT", () => {
  it("is a non-empty string mentioning Better-Cue", () => {
    expect(DEFAULT_SYSTEM_PROMPT).toBeTruthy();
    expect(DEFAULT_SYSTEM_PROMPT).toContain("Better-Cue");
  });
});

describe("SYSTEM_PROMPTS", () => {
  it("contains concise, precision, and creative presets", () => {
    expect(SYSTEM_PROMPTS).toHaveProperty("concise");
    expect(SYSTEM_PROMPTS).toHaveProperty("precision");
    expect(SYSTEM_PROMPTS).toHaveProperty("creative");
  });

  it("each preset is a non-empty string", () => {
    for (const [, prompt] of Object.entries(SYSTEM_PROMPTS)) {
      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(50);
    }
  });
});

describe("getSystemPrompt", () => {
  it("returns DEFAULT_SYSTEM_PROMPT when no preset is given", () => {
    expect(getSystemPrompt()).toBe(DEFAULT_SYSTEM_PROMPT);
    expect(getSystemPrompt(undefined)).toBe(DEFAULT_SYSTEM_PROMPT);
  });

  it("returns the concise preset when requested", () => {
    const result = getSystemPrompt("concise");
    expect(result).toContain("concise");
    expect(result).toContain("direct");
  });

  it("returns the precision preset when requested", () => {
    const result = getSystemPrompt("precision");
    expect(result).toContain("specificity");
    expect(result).toContain("ambiguity");
  });

  it("returns the creative preset when requested", () => {
    const result = getSystemPrompt("creative");
    expect(result).toContain("vivid");
    expect(result).toContain("imaginative");
  });

  it("returns DEFAULT_SYSTEM_PROMPT for unknown presets", () => {
    expect(getSystemPrompt("unknown-preset")).toBe(DEFAULT_SYSTEM_PROMPT);
  });

  it("returns DEFAULT_SYSTEM_PROMPT for empty string preset", () => {
    expect(getSystemPrompt("")).toBe(DEFAULT_SYSTEM_PROMPT);
  });
});
