import { describe, expect, it } from "vitest";
import { LANGUAGES, DOMAINS, IDIOM_GUARD, findLanguage, findDomain, buildNuanceDirective } from "@/lib/nuance/registry";

describe("language registry", () => {
  it("carries the six launch languages, each with a glyph and tint", () => {
    const codes = LANGUAGES.map((l) => l.code).sort();
    expect(codes).toEqual(["ar", "de", "en", "es", "fr", "ja"]);
    for (const l of LANGUAGES) {
      expect(l.nativeName).toBeTruthy();
      expect(l.glyph).toBeTruthy();
      expect(typeof l.tint).toBe("number");
      expect(l.source).toBeTruthy();
      expect(l.target).toBeTruthy();
    }
  });

  it("finds a language by code and is undefined for auto/unknown", () => {
    expect(findLanguage("fr")?.name).toBe("French");
    expect(findLanguage("auto")).toBeUndefined();
    expect(findLanguage(null)).toBeUndefined();
    expect(findLanguage("xx")).toBeUndefined();
  });

  it("falls back to the general domain for an unknown domain", () => {
    expect(findDomain("scientific").code).toBe("scientific");
    expect(findDomain("nope").code).toBe("general");
  });

  it("has a non-empty idiom guard", () => {
    expect(IDIOM_GUARD).toContain("IDIOM");
    expect(IDIOM_GUARD).toContain("PUN");
  });

  it("builds a directive scoped to source, target and domain", () => {
    const d = buildNuanceDirective("fr", "en", "scientific", "advanced");
    expect(d).toContain("French");
    expect(d).toContain("English");
    expect(d).toContain("terminological precision");
    expect(d).toContain("IDIOM");
  });

  it("has four domains", () => {
    expect(DOMAINS.map((d) => d.code).sort()).toEqual(["general", "legal", "literary", "scientific"]);
  });
});
