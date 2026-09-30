import { describe, expect, it } from "vitest";
import { marker, SECTIONS, PAGE_SECTIONS, buildUserPrompt, buildPagePrompt, buildSystemPrompt, buildPageSystemPrompt } from "@/lib/providers/prompt";
import type { ComprehensionRequest } from "@/lib/providers/types";

describe("prompt builders", () => {
  const req: ComprehensionRequest = {
    text: "Il a vendu la meche.",
    sourceLanguage: "fr",
    targetLanguage: "en",
    comprehensionDepth: "intermediate",
    domain: "literary",
  };

  it("emits the five passage markers", () => {
    const u = buildUserPrompt(req);
    for (const s of SECTIONS) expect(u).toContain(marker(s));
  });

  it("embeds the passage and the target language direction", () => {
    const u = buildUserPrompt(req);
    expect(u).toContain("Il a vendu la meche.");
    expect(u).toContain("English");
  });

  it("emits sense and hard markers for a whole text", () => {
    const p = buildPagePrompt(req);
    for (const s of PAGE_SECTIONS) expect(p).toContain(marker(s));
  });

  it("system prompts forbid guessing a language for a fragment", () => {
    expect(buildSystemPrompt()).toContain("fragment");
    expect(buildPageSystemPrompt()).toContain("confidence");
  });

  it("marker wraps a name in triple angle brackets", () => {
    expect(marker("SENSE")).toBe("<<<SENSE>>>");
  });
});
