import { describe, expect, it } from "bun:test";
import {
  getModelPricing,
  formatPricing,
  getModelPriceLabel,
  enrichModelsWithPricing,
  OPENAI_PRICING,
  ANTHROPIC_PRICING,
  GOOGLE_PRICING,
  OLLAMA_PRICING,
} from "../../../shared/providers/pricing";

describe("getModelPricing", () => {
  it("returns pricing for exact model match (openai)", () => {
    const pricing = getModelPricing("openai", "gpt-4o");
    expect(pricing).not.toBeNull();
    expect(pricing!.inputPer1M).toBe(2.50);
    expect(pricing!.outputPer1M).toBe(10.00);
  });

  it("returns pricing for exact model match (anthropic)", () => {
    const pricing = getModelPricing("anthropic", "claude-3-5-sonnet-latest");
    expect(pricing).not.toBeNull();
    expect(pricing!.inputPer1M).toBe(3.00);
    expect(pricing!.outputPer1M).toBe(15.00);
  });

  it("returns pricing for exact model match (google)", () => {
    const pricing = getModelPricing("google", "gemini-2.5-flash");
    expect(pricing).not.toBeNull();
    expect(pricing!.inputPer1M).toBe(0.15);
    expect(pricing!.outputPer1M).toBe(0.60);
  });

  it("matches via prefix for dated model versions", () => {
    const pricing = getModelPricing("openai", "gpt-4o-mini-2024-07-18");
    expect(pricing).not.toBeNull();
    expect(pricing!.inputPer1M).toBe(0.15);
  });

  it("returns null for unknown model", () => {
    expect(getModelPricing("openai", "nonexistent-model-v99")).toBeNull();
  });

  it("returns null for unknown provider", () => {
    expect(getModelPricing("unknown-provider", "gpt-4o")).toBeNull();
  });
});

describe("formatPricing", () => {
  it("formats prices >= $1 with two decimal places", () => {
    expect(formatPricing({ inputPer1M: 2.50, outputPer1M: 10.00 })).toBe("$2.50/$10.00");
    expect(formatPricing({ inputPer1M: 15.00, outputPer1M: 75.00 })).toBe("$15.00/$75.00");
  });

  it("formats prices < $1 with three decimal places, trimming trailing zeros", () => {
    const result = formatPricing({ inputPer1M: 0.15, outputPer1M: 0.60 });
    expect(result).toMatch(/^\$0\.\d+\/\$0\.\d+$/);
  });

  it("handles very small prices", () => {
    const result = formatPricing({ inputPer1M: 0.0375, outputPer1M: 0.15 });
    expect(result).toContain("$0");
  });
});

describe("getModelPriceLabel", () => {
  it(`returns "Free (local)" for ollama`, () => {
    expect(getModelPriceLabel("ollama", "any-model")).toBe("Free (local)");
  });

  it("returns price string for known models", () => {
    const label = getModelPriceLabel("openai", "gpt-4o");
    expect(label).toBeTruthy();
    expect(label).toContain("$");
  });

  it("returns empty string for unknown models", () => {
    expect(getModelPriceLabel("openai", "unknown-model")).toBe("");
  });
});

describe("enrichModelsWithPricing", () => {
  it("enriches each model with displayName and priceLabel", () => {
    const result = enrichModelsWithPricing("openai", ["gpt-4o", "gpt-4o-mini"]);

    expect(result).toHaveLength(2);

    expect(result[0]!.id).toBe("gpt-4o");
    expect(result[0]!.displayName).toBe("GPT-4o");
    expect(result[0]!.priceLabel).toContain("$");
    expect(result[0]!.pricing).not.toBeNull();

    expect(result[1]!.id).toBe("gpt-4o-mini");
    expect(result[1]!.displayName).toBe("GPT-4o Mini");
  });

  it("uses model id as displayName when no display name is set", () => {
    const result = enrichModelsWithPricing("openai", ["gpt-4o-2024-08-06"]);
    expect(result[0]!.displayName).toBe("gpt-4o-2024-08-06");
  });

  it("handles empty model list", () => {
    expect(enrichModelsWithPricing("openai", [])).toEqual([]);
  });
});

describe("pricing table structure", () => {
  it("OPENAI_PRICING has entries", () => {
    expect(Object.keys(OPENAI_PRICING).length).toBeGreaterThan(10);
  });

  it("ANTHROPIC_PRICING has entries", () => {
    expect(Object.keys(ANTHROPIC_PRICING).length).toBeGreaterThan(5);
  });

  it("GOOGLE_PRICING has entries", () => {
    expect(Object.keys(GOOGLE_PRICING).length).toBeGreaterThan(5);
  });

  it("OLLAMA_PRICING is empty", () => {
    expect(OLLAMA_PRICING).toEqual({});
  });
});
