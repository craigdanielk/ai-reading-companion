import type { DomainCode } from "@/lib/nuance/registry";

// What a text IS, as opposed to what it is ABOUT (the comprehension domain) or
// what language it is in (the profile). The form is orthogonal to the register,
// but they pair usefully: choosing "Paper" is also a statement that the reader
// wants scientific register, so the kind seeds the domain.
export type TextKind = "book" | "paper" | "article" | "essay" | "poem" | "note" | "other";

export interface TextKindInfo {
  code: TextKind;
  label: string;
  /** bucket heading on the shelf */
  plural: string;
  /** the comprehension domain this form usually implies */
  domain: DomainCode;
  /** badge tint, hue degrees */
  tint: number;
  hint: string;
}

export const TEXT_KINDS: TextKindInfo[] = [
  { code: "book", label: "Book", plural: "Books", domain: "general", tint: 28, hint: "Long-form, one text per chapter" },
  { code: "paper", label: "Paper", plural: "Papers", domain: "scientific", tint: 200, hint: "Academic or technical" },
  { code: "article", label: "Article", plural: "Articles", domain: "general", tint: 158, hint: "Journalism, long-form web" },
  { code: "essay", label: "Essay", plural: "Essays", domain: "literary", tint: 268, hint: "Argumentative or literary nonfiction" },
  { code: "poem", label: "Poem", plural: "Poems", domain: "literary", tint: 340, hint: "Verse, where line breaks carry meaning" },
  { code: "note", label: "Note", plural: "Notes", domain: "general", tint: 42, hint: "A passage you captured to understand" },
  { code: "other", label: "Other", plural: "Other", domain: "general", tint: 216, hint: "Anything that does not fit" },
];

/** Shelf bucket order — the deliberate forms first, capture last. */
export const KIND_ORDER: TextKind[] = ["book", "paper", "article", "essay", "poem", "note", "other"];

export function findKind(code: string | null | undefined): TextKindInfo {
  return TEXT_KINDS.find((k) => k.code === code) ?? TEXT_KINDS[TEXT_KINDS.length - 1];
}

/** A pasted passage is a capture, not a book. Books are deliberate. */
export const DEFAULT_KIND: TextKind = "note";
