import { describe, expect, it } from "vitest";
import { TEXT_KINDS, KIND_ORDER, DEFAULT_KIND, findKind } from "@/lib/text-kinds";

describe("text kinds", () => {
  it("offers the seven forms, each with a bucket name and a domain", () => {
    expect(TEXT_KINDS).toHaveLength(7);
    for (const k of TEXT_KINDS) {
      expect(k.label).toBeTruthy();
      expect(k.plural).toBeTruthy();
      expect(k.hint).toBeTruthy();
      expect(typeof k.tint).toBe("number");
      expect(["general", "literary", "scientific", "legal"]).toContain(k.domain);
    }
  });

  it("orders buckets deliberate-first, capture-last", () => {
    expect(KIND_ORDER[0]).toBe("book");
    expect(KIND_ORDER[KIND_ORDER.length - 1]).toBe("other");
    expect(KIND_ORDER).toHaveLength(TEXT_KINDS.length);
  });

  it("defaults a pasted passage to a note, not a book", () => {
    expect(DEFAULT_KIND).toBe("note");
  });

  it("seeds the register from the form", () => {
    expect(findKind("paper").domain).toBe("scientific");
    expect(findKind("poem").domain).toBe("literary");
    expect(findKind("essay").domain).toBe("literary");
    expect(findKind("book").domain).toBe("general");
  });

  it("falls back to Other for an unknown or missing kind", () => {
    expect(findKind("nonsense").code).toBe("other");
    expect(findKind(null).code).toBe("other");
    expect(findKind(undefined).code).toBe("other");
  });
});
