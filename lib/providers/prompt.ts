import { buildNuanceDirective } from "@/lib/nuance/registry";
import { ComprehensionRequest } from "./types";

export const SECTIONS = ["ORIGINAL", "UNDERSTANDING", "TERMS", "KEYIDEA", "EXPLANATION"] as const;
export type SectionName = (typeof SECTIONS)[number];

export function marker(name: SectionName): string {
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
