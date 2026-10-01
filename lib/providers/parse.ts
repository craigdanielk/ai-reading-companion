import { marker } from "./prompt";
import { SLOT, findAction, variantFor, type ActionSection, type Marker, type Scope } from "@/lib/actions/registry";

export interface Sections {
  original: string;
  understanding: string;
  importantTerms: string[];
  keyIdea: string;
  explanation: string;
}

export interface PageSections {
  sense: string;
  hard: string[];
}

/** The five storage slots every action writes into. */
export interface ParsedAction {
  original: string | null;
  understanding: string | null;
  terms: string[] | null;
  keyIdea: string | null;
  explanation: string | null;
}

/**
 * Split a stream by the given markers. Safe on partial text: an unterminated
 * section simply yields what exists up to the next marker or end of stream.
 */
export function parseMarkers(raw: string, names: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const tag = marker(name as Marker);
    const start = raw.indexOf(tag);
    if (start === -1) continue;
    const from = start + tag.length;
    let to = raw.length;
    for (const other of names) {
      const next = raw.indexOf(marker(other as Marker), from);
      if (next !== -1 && next < to) to = next;
    }
    out[name] = raw.slice(from, to).trim();
  }
  return out;
}

// Terms arrive semicolon-separated; a hard-parts list arrives one per line.
function splitList(body: string, name: Marker): string[] {
  if (name === "HARD") {
    return body
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter((l) => l.length > 0 && l.toLowerCase() !== "none");
  }
  return body
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Parse a streamed response for one action at one scope into storage slots.
 * Sections the action does not declare stay null, which is how the reader
 * knows to render only what was asked for.
 */
export function parseAction(raw: string, actionId: string, scope: Scope): ParsedAction {
  const empty: ParsedAction = {
    original: null,
    understanding: null,
    terms: null,
    keyIdea: null,
    explanation: null,
  };
  const variant = variantFor(findAction(actionId), scope);
  if (!variant) return empty;

  const parts = parseMarkers(raw, variant.sections.map((s: ActionSection) => s.name));
  const out = { ...empty };
  for (const s of variant.sections) {
    const body = parts[s.name];
    if (body === undefined) continue;
    const slot = SLOT[s.name];
    if (s.kind === "list") (out as Record<string, unknown>)[slot] = splitList(body, s.name);
    else (out as Record<string, unknown>)[slot] = body;
  }
  return out;
}

// --- The default action's shape, kept for existing callers and tests. ---

const KEY: Record<string, keyof Sections> = {
  ORIGINAL: "original",
  UNDERSTANDING: "understanding",
  TERMS: "importantTerms",
  KEYIDEA: "keyIdea",
  EXPLANATION: "explanation",
};

export function parseSections(raw: string): Partial<Sections> {
  const parts = parseMarkers(raw, ["ORIGINAL", "UNDERSTANDING", "TERMS", "KEYIDEA", "EXPLANATION"]);
  const out: Partial<Sections> = {};
  for (const name of Object.keys(KEY)) {
    const body = parts[name];
    if (body === undefined) continue;
    if (name === "TERMS") out[KEY[name]] = splitList(body, "TERMS") as never;
    else out[KEY[name]] = body as never;
  }
  return out;
}

export function parsePageSections(raw: string): Partial<PageSections> {
  const parts = parseMarkers(raw, ["SENSE", "HARD"]);
  const out: Partial<PageSections> = {};
  if (parts.SENSE !== undefined) out.sense = parts.SENSE;
  if (parts.HARD !== undefined) out.hard = splitList(parts.HARD, "HARD");
  return out;
}
