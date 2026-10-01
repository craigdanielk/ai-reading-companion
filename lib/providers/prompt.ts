import { buildNuanceDirective } from "@/lib/nuance/registry";
import { ComprehensionRequest } from "./types";
import { findAction, variantFor, DEFAULT_ACTION, type Marker, type Scope } from "@/lib/actions/registry";

// Prompts are assembled from the action registry. An action declares the
// sections it emits and the instruction for each; nothing here knows the name
// of any particular action. The two exported section lists below are the
// vocabulary of the default action, kept for callers that predate the registry.
export const SECTIONS = ["ORIGINAL", "UNDERSTANDING", "TERMS", "KEYIDEA", "EXPLANATION"] as const;
export type SectionName = (typeof SECTIONS)[number];

export const PAGE_SECTIONS = ["SENSE", "HARD"] as const;
export type PageSectionName = (typeof PAGE_SECTIONS)[number];

export function marker(name: Marker | SectionName | PageSectionName): string {
  return "<<<" + name + ">>>";
}

export interface BuiltPrompt {
  system: string;
  user: string;
}

/**
 * Build the system and user prompt for one action at one scope.
 * The nuance directive is injected deterministically, before the passage, so
 * the language and domain rules are never left to retrieval or chance.
 */
export function buildActionPrompt(
  req: ComprehensionRequest,
  actionId: string,
  scope: Scope
): BuiltPrompt {
  const action = findAction(actionId);
  const variant = variantFor(action, scope);
  if (!variant) {
    throw new Error("Action " + action.id + " is not offered at scope " + scope);
  }

  const nuance = buildNuanceDirective(
    req.sourceLanguage ?? "auto",
    req.targetLanguage,
    req.domain,
    req.comprehensionDepth
  );

  const lines = [
    nuance,
    "",
    variant.sourceLabel,
    '"""',
    req.text,
    '"""',
    "",
    "Respond in EXACTLY this format — each marker alone on its own line, nothing outside the sections:",
  ];
  for (const s of variant.sections) {
    lines.push(marker(s.name));
    lines.push(s.spec);
  }

  return { system: variant.system, user: lines.join("\n") };
}

// --- The default action, by name. Existing callers keep working unchanged. ---

export function buildSystemPrompt(): string {
  return findAction(DEFAULT_ACTION).passage.system;
}

export function buildPageSystemPrompt(): string {
  return findAction(DEFAULT_ACTION).text!.system;
}

export function buildUserPrompt(req: ComprehensionRequest): string {
  return buildActionPrompt(req, DEFAULT_ACTION, "passage").user;
}

export function buildPagePrompt(req: ComprehensionRequest): string {
  return buildActionPrompt(req, DEFAULT_ACTION, "text").user;
}
