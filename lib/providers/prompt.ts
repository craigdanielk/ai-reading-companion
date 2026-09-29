import { buildNuanceDirective } from "@/lib/nuance/registry";
import { ComprehensionRequest } from "./types";

export function buildSystemPrompt(): string {
  return [
    "You are a multilingual reading companion. Your purpose is comprehension, not literal translation.",
    "You help a reader understand a passage written in another language: what it means, how it is built, what it implies, and what a flat translation would lose.",
    "Translate into the reader's preferred language while preserving meaning, context, tone, and nuance.",
    "Explain grammar, sentence structure, register, and implied meaning where it helps understanding.",
    "Respond with JSON only.",
  ].join(" ");
}

export function buildUserPrompt(req: ComprehensionRequest): string {
  const nuance = buildNuanceDirective(req.targetLanguage, req.domain, req.comprehensionDepth);
  return [
    nuance,
    "",
    "PASSAGE:",
    '"""',
    req.text,
    '"""',
    "",
    'Respond as a JSON object with keys: "original" (string), "understanding" (string — the meaning-preserving rendering in the target language, NOT a word-for-word translation), "importantTerms" (array of strings), "keyIdea" (string), "explanation" (string — grammar, structure, register, idiom/pun handling, and implied meaning where useful).',
  ].join("\n");
}
