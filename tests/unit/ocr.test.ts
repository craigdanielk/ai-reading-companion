import { describe, expect, it } from "vitest";
import { stripFences } from "@/lib/providers/ocr";

describe("stripFences", () => {
  it("removes an opening fence with a language tag", () => {
    expect(stripFences("```\nPrivacy & data handling\n\nJeralis is a beta.")).toBe(
      "Privacy & data handling\n\nJeralis is a beta."
    );
  });

  it("removes a fence that wraps the whole block", () => {
    expect(stripFences("```markdown\nline one\nline two\n```")).toBe("line one\nline two");
  });

  it("leaves clean text untouched", () => {
    expect(stripFences("Il a vendu la meche.")).toBe("Il a vendu la meche.");
  });

  it("handles empty input", () => {
    expect(stripFences("")).toBe("");
  });
});
