import { describe, expect, it } from "vitest";
import { extractJson, normaliseTerms } from "@/lib/providers/chat";

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a": 1}').a).toBe(1);
  });

  it("strips a fenced code block", () => {
    const out = extractJson('```json\n{"a": 2}\n```');
    expect(out.a).toBe(2);
  });

  it("extracts JSON buried in prose", () => {
    const out = extractJson('Here is the result: {"a": 3} hope it helps');
    expect(out.a).toBe(3);
  });

  it("repairs raw newlines inside string values", () => {
    const out = extractJson('{"explanation": "line one\nline two"}');
    expect(out.explanation).toBe("line one\nline two");
  });

  it("throws on unparseable input", () => {
    expect(() => extractJson("not json at all")).toThrow();
  });
});

describe("normaliseTerms", () => {
  it("passes strings through and joins term/meaning objects", () => {
    const out = normaliseTerms(["foo", { term: "bar", meaning: "baz" }, 42]);
    expect(out).toEqual(["foo", "bar — baz", "42"]);
  });

  it("returns an empty array for non-arrays", () => {
    expect(normaliseTerms("nope")).toEqual([]);
  });
});
