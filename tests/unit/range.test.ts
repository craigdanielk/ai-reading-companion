import { describe, expect, it } from "vitest";
import { snapRange } from "@/lib/text/range";

describe("snapRange", () => {
  const text = "Il a vendu la meche, mais personne ne l'a remarque.";

  it("walks a mid-word selection out to word boundaries", () => {
    const r = snapRange(text, 7, 24);
    expect(text.slice(r.start, r.end)).toBe("vendu la meche, mais");
  });

  it("trims surrounding whitespace", () => {
    const r = snapRange("  hello world  ", 0, 15);
    expect("  hello world  ".slice(r.start, r.end)).toBe("hello world");
  });

  it("leaves a clean word selection unchanged", () => {
    const r = snapRange(text, 0, 5);
    expect(text.slice(r.start, r.end).trim()).toBe("Il a");
  });

  it("clamps out-of-range offsets", () => {
    const r = snapRange(text, -5, 9999);
    expect(r.start).toBe(0);
    expect(r.end).toBe(text.length);
  });

  it("keeps apostrophes and accents inside a word", () => {
    const s = "l'essentiel est invisible";
    const r = snapRange(s, 3, 7);
    expect(s.slice(r.start, r.end)).toBe("l'essentiel");
  });
});
