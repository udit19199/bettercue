import { describe, expect, it } from "bun:test";
import { parseQuestionsResponse } from "../../../shared/questions/parse";

describe("parseQuestionsResponse", () => {
  it("parses raw JSON with a questions array", () => {
    const input = JSON.stringify({
      questions: [
        { id: "audience", question: "Who is the target?", type: "text" },
      ],
    });

    const result = parseQuestionsResponse(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("audience");
    expect(result[0]!.type).toBe("text");
  });

  it("parses JSON inside a markdown code block", () => {
    const input = [
      "```json",
      JSON.stringify({
        questions: [
          { id: "tone", question: "What tone?", type: "select", options: ["Formal", "Casual"] },
        ],
      }),
      "```",
    ].join("\n");

    const result = parseQuestionsResponse(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("tone");
    expect(result[0]!.type).toBe("select");
    expect(result[0]!.options).toEqual(["Formal", "Casual"]);
  });

  it("parses select-type questions with options", () => {
    const input = JSON.stringify({
      questions: [
        {
          id: "difficulty",
          question: "Difficulty level?",
          type: "select",
          options: ["Beginner", "Intermediate", "Advanced"],
          required: true,
        },
      ],
    });

    const result = parseQuestionsResponse(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("difficulty");
    expect(result[0]!.type).toBe("select");
    expect(result[0]!.options).toHaveLength(3);
    expect(result[0]!.required).toBe(true);
  });

  it("parses multi-type questions with options", () => {
    const input = JSON.stringify({
      questions: [
        {
          id: "features",
          question: "Which features?",
          type: "multi",
          options: ["Speed", "Security", "UX"],
        },
      ],
    });

    const result = parseQuestionsResponse(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("multi");
    expect(result[0]!.options).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    expect(parseQuestionsResponse("")).toEqual([]);
    expect(parseQuestionsResponse("   ")).toEqual([]);
  });

  it("returns empty array for malformed JSON", () => {
    expect(parseQuestionsResponse("not json at all")).toEqual([]);
    expect(parseQuestionsResponse("{invalid}")).toEqual([]);
  });

  it("returns empty array when JSON has no questions key", () => {
    expect(parseQuestionsResponse('{"items": []}')).toEqual([]);
  });

  it("returns empty array when questions is not an array", () => {
    expect(parseQuestionsResponse('{"questions": "string"}')).toEqual([]);
    expect(parseQuestionsResponse('{"questions": {}}')).toEqual([]);
  });

  it("filters out invalid question objects", () => {
    const input = JSON.stringify({
      questions: [
        { id: "valid", question: "Valid?", type: "text" },
        { id: "", question: "Missing id", type: "text" },
        { question: "No id field", type: "text" },
        { id: "no_question", type: "text" },
        { id: "bad_type", question: "Bad type", type: "invalid" },
        { id: "select_no_opts", question: "No options", type: "select" },
        { id: "select_one_opt", question: "One option", type: "select", options: ["Only"] },
        { id: "multi_no_opts", question: "No opts", type: "multi", options: ["One"] },
      ],
    });

    const result = parseQuestionsResponse(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("valid");
  });

  it("handles text type without options (options field should not be present)", () => {
    const input = JSON.stringify({
      questions: [
        { id: "feedback", question: "Any feedback?", type: "text" },
      ],
    });

    const result = parseQuestionsResponse(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("text");
    expect(result[0]).not.toHaveProperty("options");
  });

  it("handles multiple questions", () => {
    const input = JSON.stringify({
      questions: [
        { id: "q1", question: "First?", type: "text" },
        { id: "q2", question: "Second?", type: "select", options: ["A", "B"] },
        { id: "q3", question: "Third?", type: "multi", options: ["X", "Y", "Z"] },
      ],
    });

    const result = parseQuestionsResponse(input);
    expect(result).toHaveLength(3);
  });
});
