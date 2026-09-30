import { describe, expect, it } from "vitest";
import { parseSections, parsePageSections } from "@/lib/providers/parse";

describe("parseSections", () => {
  it("parses a complete marked response", () => {
    const raw = [
      "<<<ORIGINAL>>>",
      "Il a vendu la meche.",
      "<<<UNDERSTANDING>>>",
      "He let the cat out of the bag.",
      "<<<TERMS>>>",
      "vendre la meche - spill the beans; meche - wick",
      "<<<KEYIDEA>>>",
      "A secret was revealed.",
      "<<<EXPLANATION>>>",
      "An idiom.",
    ].join("\n");
    const p = parseSections(raw);
    expect(p.original).toBe("Il a vendu la meche.");
    expect(p.understanding).toBe("He let the cat out of the bag.");
    expect(p.importantTerms).toEqual(["vendre la meche - spill the beans", "meche - wick"]);
    expect(p.keyIdea).toBe("A secret was revealed.");
    expect(p.explanation).toBe("An idiom.");
  });

  it("is safe on a partial stream", () => {
    const raw = "<<<ORIGINAL>>>\nIl a vendu la meche.\n<<<UNDERSTANDING>>>\nHe let the cat";
    const p = parseSections(raw);
    expect(p.original).toBe("Il a vendu la meche.");
    expect(p.understanding).toBe("He let the cat");
    expect(p.keyIdea).toBeUndefined();
  });

  it("returns an empty object for empty input", () => {
    expect(parseSections("")).toEqual({});
  });

  it("drops empty term entries", () => {
    const p = parseSections("<<<TERMS>>>\nfoo - bar; ;  ; baz - qux");
    expect(p.importantTerms).toEqual(["foo - bar", "baz - qux"]);
  });
});

describe("parsePageSections", () => {
  it("parses sense and hard passages", () => {
    const raw = [
      "<<<SENSE>>>",
      "A contemplative literary text.",
      "<<<HARD>>>",
      "- Il a vendu la meche - an idiom for revealing a secret",
      "- l essentiel - what is essential",
    ].join("\n");
    const p = parsePageSections(raw);
    expect(p.sense).toBe("A contemplative literary text.");
    expect(p.hard).toHaveLength(2);
  });

  it("treats an explicit none as no hard passages", () => {
    const p = parsePageSections("<<<SENSE>>>\nText.\n<<<HARD>>>\nnone");
    expect(p.hard).toEqual([]);
  });

  it("is safe on a partial stream", () => {
    const p = parsePageSections("<<<SENSE>>>\nThe text is");
    expect(p.sense).toBe("The text is");
    expect(p.hard).toBeUndefined();
  });
});
