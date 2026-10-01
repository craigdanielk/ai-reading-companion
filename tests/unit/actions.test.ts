import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  DEFAULT_ACTION,
  SLOT,
  actionsForScope,
  findAction,
  scopeForSelection,
  variantFor,
  type Scope,
} from "@/lib/actions/registry";
import { buildActionPrompt, marker } from "@/lib/providers/prompt";
import { parseAction } from "@/lib/providers/parse";
import type { ComprehensionRequest } from "@/lib/providers/types";

const SCOPES: Scope[] = ["word", "sentence", "passage", "text"];
const ALL_MARKERS = ["ORIGINAL", "UNDERSTANDING", "TERMS", "KEYIDEA", "EXPLANATION", "SENSE", "HARD"];
const SLOTS = ["original", "understanding", "terms", "keyIdea", "explanation"] as const;

const req: ComprehensionRequest = {
  text: "Il a vendu la meche, mais personne ne l'a remarque.",
  sourceLanguage: "fr",
  targetLanguage: "en",
  comprehensionDepth: "intermediate",
  domain: "literary",
};

describe("action registry", () => {
  it("gives every action a unique id and a reader-facing label", () => {
    const ids = ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACTIONS) {
      expect(a.label).toBeTruthy();
      expect(a.hint).toBeTruthy();
      expect(a.scopes.length).toBeGreaterThan(0);
    }
  });

  it("declares a variant for every scope it claims to offer", () => {
    for (const a of ACTIONS) {
      for (const s of a.scopes) {
        expect(variantFor(a, s), a.id + " at " + s).not.toBeNull();
      }
    }
  });

  it("offers a whole-text variant only where the action declares one", () => {
    for (const a of ACTIONS) {
      expect(variantFor(a, "text") !== null).toBe(Boolean(a.text));
    }
    expect(findAction("translate").text).toBeUndefined();
  });

  it("uses each marker at most once within a variant", () => {
    for (const a of ACTIONS) {
      for (const v of [a.passage, a.text]) {
        if (!v) continue;
        const names = v.sections.map((s) => s.name);
        expect(new Set(names).size).toBe(names.length);
      }
    }
  });

  it("maps every marker it can emit onto a storage slot", () => {
    for (const a of ACTIONS) {
      for (const v of [a.passage, a.text]) {
        if (!v) continue;
        for (const s of v.sections) expect(SLOT[s.name]).toBeTruthy();
      }
    }
  });

  it("falls back to the default action for an unknown id", () => {
    expect(findAction("nonsense").id).toBe(DEFAULT_ACTION);
    expect(findAction(null).id).toBe(DEFAULT_ACTION);
    expect(findAction(undefined).id).toBe(DEFAULT_ACTION);
  });

  it("offers the expected verbs at each scope", () => {
    const idsAt = (s: Scope) => actionsForScope(s).map((a) => a.id);
    expect(idsAt("word")).toEqual(["understand", "translate", "grammar", "define"]);
    expect(idsAt("passage")).toContain("simplify");
    expect(idsAt("text")).toEqual(["understand", "hardparts", "summarise"]);
    expect(idsAt("text")).not.toContain("translate");
  });
});

describe("scopeForSelection", () => {
  it("reads a single word as a word", () => {
    expect(scopeForSelection("meche")).toBe("word");
    expect(scopeForSelection("  meche  ")).toBe("word");
    // Two words is already a phrase, and a phrase gets the phrase verbs.
    expect(scopeForSelection("la meche")).toBe("sentence");
  });

  it("reads a short unfinished phrase as a sentence", () => {
    expect(scopeForSelection("il a vendu la meche")).toBe("sentence");
    expect(scopeForSelection("vendu la meche mais")).toBe("sentence");
  });

  it("keeps a short finished sentence a sentence, not a passage", () => {
    expect(scopeForSelection("Il a vendu la meche.")).toBe("sentence");
    expect(scopeForSelection("Il a vendu la meche mais")).toBe("sentence");
  });

  it("reads past a couple of clauses as a passage", () => {
    expect(scopeForSelection("one two three four five six seven eight nine ten eleven twelve thirteen")).toBe(
      "passage"
    );
    expect(scopeForSelection("Il a vendu la meche, mais personne ne l'a remarque, et la ville a continue.")).toBe(
      "passage"
    );
  });
});

describe("buildActionPrompt", () => {
  it("emits exactly the markers the action declared, and no others", () => {
    for (const a of ACTIONS) {
      for (const s of SCOPES) {
        const v = variantFor(a, s);
        if (!v) continue;
        const built = buildActionPrompt(req, a.id, s);
        const declared = v.sections.map((x) => x.name as string);
        for (const name of declared) expect(built.user).toContain(marker(name as never));
        for (const name of ALL_MARKERS) {
          if (declared.includes(name)) continue;
          expect(built.user, a.id + " at " + s).not.toContain(marker(name as never));
        }
      }
    }
  });

  it("always carries the passage and the language direction", () => {
    const built = buildActionPrompt(req, "translate", "passage");
    expect(built.user).toContain("Il a vendu la meche");
    expect(built.user).toContain("English");
    expect(built.system).toContain("reading companion");
  });

  it("refuses an action at a scope it is not offered at", () => {
    expect(() => buildActionPrompt(req, "translate", "text")).toThrow();
    expect(() => buildActionPrompt(req, "define", "text")).toThrow();
  });
});

describe("parseAction", () => {
  const fill = (actionId: string, scope: Scope): string => {
    const v = variantFor(findAction(actionId), scope)!;
    return v.sections
      .map((s) => marker(s.name) + "\n" + (s.kind === "list" ? "one - a; two - b" : "body for " + s.name))
      .join("\n");
  };

  it("fills only the slots the action declares", () => {
    for (const a of ACTIONS) {
      for (const s of SCOPES) {
        const v = variantFor(a, s);
        if (!v) continue;
        const parsed = parseAction(fill(a.id, s), a.id, s) as unknown as Record<string, unknown>;
        const declared = new Set(v.sections.map((x) => SLOT[x.name] as string));
        for (const slot of SLOTS) {
          if (declared.has(slot)) {
            expect(parsed[slot], a.id + " at " + s + " should fill " + slot).toBeTruthy();
          } else {
            expect(parsed[slot], a.id + " at " + s + " should leave " + slot + " empty").toBeNull();
          }
        }
      }
    }
  });

  it("splits a terms list on semicolons and a hard-parts list on lines", () => {
    const terms = parseAction("<<<UNDERSTANDING>>>\nx\n<<<TERMS>>>\na - 1; b - 2", "understand", "passage");
    expect(terms.terms).toEqual(["a - 1", "b - 2"]);
    const hard = parseAction("<<<HARD>>>\n- one\ntwo\nnone", "hardparts", "text");
    expect(hard.terms).toEqual(["one", "two"]);
  });

  it("returns nothing for an action that does not apply at the scope", () => {
    const parsed = parseAction("<<<UNDERSTANDING>>>\nx", "translate", "text");
    expect(parsed.understanding).toBeNull();
  });

  it("is safe on a partial stream", () => {
    const partial = parseAction("<<<UNDERSTANDING>>>\nhalf a thou", "understand", "passage");
    expect(partial.understanding).toBe("half a thou");
    expect(partial.explanation).toBeNull();
  });
});
