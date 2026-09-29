import { SECTIONS, PAGE_SECTIONS, marker, SectionName, PageSectionName } from "./prompt";

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

// Parse whatever has arrived so far. Safe on partial text: an unterminated
// section simply yields what exists up to the next marker or end of stream.
function splitMarked(raw: string, names: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const tag = marker(name as SectionName);
    const start = raw.indexOf(tag);
    if (start === -1) continue;
    const from = start + tag.length;
    let to = raw.length;
    for (const other of names) {
      const next = raw.indexOf(marker(other as SectionName), from);
      if (next !== -1 && next < to) to = next;
    }
    out[name] = raw.slice(from, to).trim();
  }
  return out;
}

const KEY: Record<SectionName, keyof Sections> = {
  ORIGINAL: "original",
  UNDERSTANDING: "understanding",
  TERMS: "importantTerms",
  KEYIDEA: "keyIdea",
  EXPLANATION: "explanation",
};

export function parseSections(raw: string): Partial<Sections> {
  const parts = splitMarked(raw, SECTIONS);
  const out: Partial<Sections> = {};
  for (const name of SECTIONS) {
    const body = parts[name];
    if (body === undefined) continue;
    if (name === "TERMS") {
      out[KEY[name]] = body
        .split(";")
        .map((t) => t.trim())
        .filter(Boolean) as never;
    } else {
      out[KEY[name]] = body as never;
    }
  }
  return out;
}

const PAGE_KEY: Record<PageSectionName, keyof PageSections> = { SENSE: "sense", HARD: "hard" };

export function parsePageSections(raw: string): Partial<PageSections> {
  const parts = splitMarked(raw, PAGE_SECTIONS);
  const out: Partial<PageSections> = {};
  if (parts.SENSE !== undefined) out.sense = parts.SENSE;
  if (parts.HARD !== undefined) {
    out.hard = parts.HARD
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter((l) => l.length > 0 && l.toLowerCase() !== "none");
  }
  return out;
}

export function sectionBodyFor(streamed: string, name: SectionName): string {
  const parsed = parseSections(streamed);
  const k = KEY[name];
  const v = parsed[k];
  return Array.isArray(v) ? v.join("; ") : ((v as string) || "");
}
