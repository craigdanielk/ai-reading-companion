import { SECTIONS, marker, SectionName } from "./prompt";

export interface Sections {
  original: string;
  understanding: string;
  importantTerms: string[];
  keyIdea: string;
  explanation: string;
}

const KEY: Record<SectionName, keyof Sections> = {
  ORIGINAL: "original",
  UNDERSTANDING: "understanding",
  TERMS: "importantTerms",
  KEYIDEA: "keyIdea",
  EXPLANATION: "explanation",
};

// Parse whatever has arrived so far. Safe on partial text: an unterminated
// section simply yields what exists up to the next marker or end of stream.
export function parseSections(raw: string): Partial<Sections> {
  const out: Partial<Sections> = {};
  for (let i = 0; i < SECTIONS.length; i++) {
    const name = SECTIONS[i];
    const start = raw.indexOf(marker(name));
    if (start === -1) continue;
    const from = start + marker(name).length;
    let to = raw.length;
    for (let j = 0; j < SECTIONS.length; j++) {
      const next = raw.indexOf(marker(SECTIONS[j]), from);
      if (next !== -1 && next < to) to = next;
    }
    const body = raw.slice(from, to).trim();
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

export function sectionBodyFor(streamed: string, name: SectionName): string {
  const parsed = parseSections(streamed);
  const k = KEY[name];
  const v = parsed[k];
  return Array.isArray(v) ? v.join("; ") : ((v as string) || "");
}
