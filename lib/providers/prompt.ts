import { buildNuanceDirective } from "@/lib/nuance/registry";
import { ComprehensionRequest } from "./types";

// Two output shapes. A selection is short, so it gets the full treatment.
// A whole text is long, so it gets a running sense plus only the hard parts —
// a five-section deep-dive on 2,000 words is slow to produce and useless to read.
export const SECTIONS = ["ORIGINAL", "UNDERSTANDING", "TERMS", "KEYIDEA", "EXPLANATION"] as const;
export type SectionName = (typeof SECTIONS)[number];

export const PAGE_SECTIONS = ["SENSE", "HARD"] as const;
export type PageSectionName = (typeof PAGE_SECTIONS)[number];

export function marker(name: SectionName | PageSectionName): string {
  return "<<<" + name + ">>>";
}

export function buildSystemPrompt(): string {
  return [
    "You are a multilingual reading companion. Your purpose is comprehension, not literal translation.",
    "You help a reader understand a passage written in another language: what it means, how it is built, what it implies, and what a flat translation would lose.",
    "Translate into the reader's preferred language while preserving meaning, context, tone, and nuance.",
    "Explain grammar, sentence structure, register, and implied meaning where it helps understanding.",
    "Follow the requested output format exactly. Output nothing outside the marked sections.",
  ].join(" ");
}

export function buildPageSystemPrompt(): string {
  return [
    "You are a multilingual reading companion. Your purpose is comprehension, not literal translation.",
    "The reader has handed you an entire text — a chapter, an article, a page — not a snippet. Do NOT translate all of it.",
    "Give a running sense of what the text is and what it is doing, then give real help on only the genuinely hard parts.",
    "Be specific to THIS text. Never produce commentary that would fit any text equally well.",
    "Follow the requested output format exactly. Output nothing outside the marked sections.",
  ].join(" ");
}

export function buildUserPrompt(req: ComprehensionRequest): string {
  const nuance = buildNuanceDirective(
    req.sourceLanguage ?? "auto",
    req.targetLanguage,
    req.domain,
    req.comprehensionDepth
  );
  return [
    nuance,
    "",
    "PASSAGE:",
    '"""',
    req.text,
    '"""',
    "",
    "Respond in EXACTLY this format — each marker alone on its own line, nothing outside the sections:",
    marker("ORIGINAL"),
    "<the source passage, unchanged>",
    marker("UNDERSTANDING"),
    "<the meaning-preserving rendering in the target language — NOT a word-for-word translation>",
    marker("TERMS"),
    "<between one and six entries, each written as: term — short meaning; separated by semicolons>",
    marker("KEYIDEA"),
    "<the point of the passage, one or two sentences>",
    marker("EXPLANATION"),
    "<grammar, structure, register, idiom or pun handling, and implied meaning where useful>",
  ].join("\n");
}

export function buildPagePrompt(req: ComprehensionRequest): string {
  const nuance = buildNuanceDirective(
    req.sourceLanguage ?? "auto",
    req.targetLanguage,
    req.domain,
    req.comprehensionDepth
  );
  return [
    nuance,
    "",
    "THE WHOLE TEXT:",
    '"""',
    req.text,
    '"""',
    "",
    "Respond in EXACTLY this format — each marker alone on its own line, nothing outside the sections:",
    marker("SENSE"),
    "<2 to 4 sentences in the target language: what this text is, what it is doing, and its register or tone. Do not walk through the content point by point.>",
    marker("HARD"),
    "<between zero and five entries, each on its own line, each written as: the exact source phrase — why it is hard and what it actually means. Include only what a careful reader would genuinely stumble on: idioms, puns, allusions, false friends, dense syntax, terminology. If there are none, write exactly: none>",
  ].join("\n");
}
