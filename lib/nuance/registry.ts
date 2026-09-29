// Nuance registry — the product's core asset.
// SOURCE rules govern what must be preserved/explained when reading FROM a language.
// TARGET rules govern how to write naturally INTO the reader's language.
// Injected deterministically (never retrieved by similarity): a rule that must
// always apply must never miss retrieval.

export type DomainCode = "general" | "literary" | "scientific" | "legal";

export interface LanguageNuance {
  code: string;
  name: string;
  nativeName: string;
  /** what to preserve/explain when this language is the SOURCE */
  source: string;
  /** how to write naturally when this language is the TARGET */
  target: string;
}

export const LANGUAGES: LanguageNuance[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    source:
      "Preserve register (formal / neutral / colloquial) and contraction level; surface English idioms, phrasal verbs and understatement that would be opaque if rendered literally.",
    target:
      "Write natural contemporary English, not translationese. Render idioms by their functional English equivalent, never a calque. Keep the source register — do not upgrade plain speech into formal prose.",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    source:
      "Preserve the tu/vous relationship the source implies; surface French idioms and register shifts between écrit and oral.",
    target:
      "Choose tu/vous consistently with the source relationship and keep it. Render idioms by an equivalent French idiom, never a literal calque. Use French typographic spacing and punctuation. Keep written vs spoken register distinct.",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    source:
      "Note regional variation (Spain vs Latin America) and the tú/vos/usted relationship; surface regional vocabulary that carries meaning.",
    target:
      "Choose tú / vos / usted to match the implied region and relationship, and keep it consistent. Prefer neutral international Spanish unless the source implies a region. Render idioms functionally.",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    source:
      "Identify the register: Modern Standard Arabic or a dialect (Egyptian / Levantine / Gulf / Maghrebi). Preserve cultural and religious references. Explain root-and-pattern morphology where it carries meaning.",
    target:
      "Use Modern Standard Arabic unless the source is dialectal; if dialectal, preserve the dialect or state explicitly that you are rendering into MSA and what is lost. Use correct Arabic punctuation (؟ ، ؛ ) and do not flatten cultural references.",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    source:
      "Preserve the Sie/du relationship; surface Modalpartikeln (doch, mal, ja, halt, eben) whose function is not literal; unpack stacked compounds.",
    target:
      "Choose Sie or du consistently with the source relationship. Render Modalpartikeln by communicative function, not literally. Unpack compound nouns into readable German. Preserve information carried by case.",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    source:
      "Identify the keigo register (sonkeigo / kenjōgo / teineigo / plain) and preserve it. Resolve omitted subjects explicitly, since Japanese elides them. Note uchi/soto orientation. Surface kanyoku (idioms), kotowaza (proverbs) and honorific suffixes. State what is implied, since the language is high-context.",
    target:
      "Match the required politeness register precisely and keep it consistent. Use natural Japanese honorifics rather than literal renderings. Avoid translationese; do not import source-language word order.",
  },
];

export interface DomainNuance {
  code: DomainCode;
  name: string;
  directive: string;
}

export const DOMAINS: DomainNuance[] = [
  {
    code: "general",
    name: "General",
    directive:
      "Prioritise voice, tone, and cultural resonance over literalism. Sound like a native speaker writing for a native reader.",
  },
  {
    code: "literary",
    name: "Literary / prose",
    directive:
      "Prioritise style, rhythm, and the author's voice. Preserve metaphor, imagery, and deliberate ambiguity. Do not flatten rhetorical effect for the sake of clarity.",
  },
  {
    code: "scientific",
    name: "Scientific / technical",
    directive:
      "Prioritise terminological precision over style. Use the established target-language scientific term; if none exists, keep the source term and gloss it. NEVER translate, convert, or reorder units, symbols, equations, chemical names, gene/protein names, or citations. Preserve hedging strength exactly — do not turn 'suggests' into 'demonstrates', or 'may' into 'does'. Keep the impersonal/passive conventions of the target scientific register. Preserve the distinction between statistically significant and merely observed.",
  },
  {
    code: "legal",
    name: "Legal / regulatory",
    directive:
      "Prioritise exactitude and defined-term consistency. Translate a defined term identically every time it appears. Do not substitute near-synonyms for legal terms of art. Preserve modality precisely (shall / may / must / should). Flag where a term has no exact target-language equivalent rather than approximating silently.",
  },
];

export const IDIOM_GUARD =
  "IDIOM, PUN AND CULTURAL-REFERENCE GUARD: idioms (1.65/3) and puns (1.45/3) are the weakest category for every translation model, and idioms are the element most often silently left untranslated. Never drop an idiom, pun, proverb, kanyoku, or culturally embedded expression. If a literal rendering would lose the meaning, render it functionally in the target language AND surface the original expression with its meaning in the explanation. Treat every idiom or pun present as a required, explicitly handled element.";

export function findLanguage(code: string | null | undefined): LanguageNuance | undefined {
  if (!code || code === "auto") return undefined;
  return LANGUAGES.find((l) => l.code === code);
}

export function findDomain(code: string | null | undefined): DomainNuance {
  return DOMAINS.find((d) => d.code === code) ?? DOMAINS[0];
}

export function buildNuanceDirective(
  sourceLanguage: string | null | undefined,
  targetLanguage: string,
  domain: string | null | undefined,
  depth: string
): string {
  const src = findLanguage(sourceLanguage);
  const tgt = findLanguage(targetLanguage);
  const dom = findDomain(domain);
  const parts: string[] = [];

  parts.push(
    "SOURCE LANGUAGE: " +
      (src ? src.name + " (" + src.nativeName + ")" : "auto-detect it from the passage, and say which language you detected")
  );
  if (src) parts.push("SOURCE NUANCE — " + src.source);
  else parts.push("SOURCE NUANCE — identify the source's register, idioms and culturally embedded expressions and preserve them.");

  parts.push("TARGET LANGUAGE: " + (tgt ? tgt.name + " (" + tgt.nativeName + ")" : targetLanguage));
  if (tgt) parts.push("TARGET STYLE — " + tgt.target);

  parts.push("DOMAIN: " + dom.name);
  parts.push(dom.directive);
  parts.push("COMPREHENSION DEPTH: " + depth);
  parts.push(IDIOM_GUARD);

  return parts.join("\n\n");
}
