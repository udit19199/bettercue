import { describe, expect, it } from "bun:test";
import { buildEnhancedPrompt } from "../../../shared/questions/enhance";
import type { Question } from "../../../shared/questions/types";

const textQuestion: Question = {
  id: "audience",
  question: "Who is the target audience?",
  type: "text",
};

const selectQuestion: Question = {
  id: "tone",
  question: "What tone?",
  type: "select",
  options: ["Formal", "Casual"],
};

const multiQuestion: Question = {
  id: "features",
  question: "Which features?",
  type: "multi",
  options: ["Speed", "UX"],
};

describe("buildEnhancedPrompt", () => {
  it("returns original prompt when no answers are provided", () => {
    const result = buildEnhancedPrompt("Write a story.", [textQuestion], {});
    expect(result).toBe("Write a story.");
  });

  it("returns original prompt when answers object is empty", () => {
    const result = buildEnhancedPrompt("Hello", [textQuestion], {});
    expect(result).toBe("Hello");
  });

  it("appends context for answered questions", () => {
    const result = buildEnhancedPrompt("Write a story.", [textQuestion], {
      audience: "Developers",
    });

    expect(result).toContain("Write a story.");
    expect(result).toContain("[Additional context from clarifying questions:]");
    expect(result).toContain("Q: Who is the target audience?");
    expect(result).toContain("A: Developers");
  });

  it("handles multiple answered questions", () => {
    const result = buildEnhancedPrompt("Write code.", [textQuestion, selectQuestion], {
      audience: "Beginners",
      tone: "Casual",
    });

    expect(result).toContain("Write code.");
    expect(result).toContain("Q: Who is the target audience?");
    expect(result).toContain("A: Beginners");
    expect(result).toContain("Q: What tone?");
    expect(result).toContain("A: Casual");
  });

  it("omits unanswered questions from context", () => {
    const result = buildEnhancedPrompt("Build an app.", [textQuestion, selectQuestion, multiQuestion], {
      audience: "Engineers",
    });

    expect(result).toContain("Q: Who is the target audience?");
    expect(result).toContain("A: Engineers");
    expect(result).not.toContain("What tone?");
    expect(result).not.toContain("Which features?");
  });

  it("treats whitespace-only answers as unanswered", () => {
    const result = buildEnhancedPrompt("Design a system.", [textQuestion], {
      audience: "   ",
    });

    expect(result).toBe("Design a system.");
  });

  it("joins multi-select answers with comma separator", () => {
    const answers = { features: "Speed, UX" };
    const result = buildEnhancedPrompt("Build app.", [multiQuestion], answers);

    expect(result).toContain("A: Speed, UX");
  });
});
