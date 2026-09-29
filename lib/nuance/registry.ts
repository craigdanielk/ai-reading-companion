// Nuance registry — language- and domain-specific comprehension rules.
// This is the product's core asset. Grows over time; injected deterministically
// (not retrieved by similarity) so a rule that must always apply never misses.

export type DomainCode = "general" | "literary" | "scientific" | "legal";

export interface LanguageNuance {
  code: string;
  name: string;
  nativeName: string;
  directive: string;
}

export const LANGUAGES: LanguageNuance[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    directive:
      "Preserve register and tone (formal / neutral / colloquial) exactly; do not upgrade plain speech into formal prose. Render idioms by their functional English equivalent, never word-for-word. Keep phrasal-verb and contraction register intact.",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    directive:
      "Choose tu/vous to match the source relationship and register, and keep it consistent throughout. Render idioms by an equivalent French idiom, not a literal calque. Respect French punctuation spacing and typographic conventions. Preserve the register distinction between written and spoken French.",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    directive:
      "Choose tú / vos / usted according to the implied region and relationship, and keep it consistent. Prefer neutral international Spanish unless the source implies a specific region (then preserve it). Render idioms functionally. Handle regional vocabulary deliberately rather than defaulting to one country's usage.",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    directive:
      "Choose Modern Standard Arabic unless the source is dialectal; if the source is dialectal, either preserve the dialect or state explicitly that you are rendering into MSA and what is lost. Respect root-and-pattern morphology when explaining. Preserve cultural and religious references rather than flattening them. Handle diglossia explicitly (MSA vs Egyptian/Levantine/Gulf/Maghrebi). Use correct Arabic punctuation (؟ ، ؛).",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    directive:
      "Choose Sie or du according to relationship and register, and keep it consistent. Render Modalpartikeln (doch, mal, ja, halt, eben) by their communicative function, not literally. Unpack compound nouns into readable German rather than leaving them stacked. Preserve the case system's meaning where it carries information.",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    directive:
      "Match the source politeness level using the correct keigo register — sonkeigo (respectful), kenjōgo (humble), teineigo (polite), or plain form — and never flatten it to neutral. Respect uchi/soto (in-group/out-group) orientation when choosing honorifics. Resolve omitted subjects explicitly in the explanation, since Japanese elides them. Render honorific suffixes (-san, -sama, -sensei) meaningfully rather than dropping them. Preserve high-context implication: state what is implied rather than only what is written.",
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
  "IDIOM, PUN AND CULTURAL-REFERENCE GUARD: never leave an idiom, pun, proverb, or culturally embedded expression untranslated, and never silently drop it. If a literal rendering would lose the meaning, render it functionally in the target language AND surface the original expression with its meaning in the explanation. Idioms and puns are the most common failure mode of translation models — treat any of them present in the passage as a required, explicitly handled element.";

export function findLanguage(code: string): LanguageNuance | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export function findDomain(code: string | null | undefined): DomainNuance {
  return DOMAINS.find((d) => d.code === code) ?? DOMAINS[0];
}

export function buildNuanceDirective(
  targetLanguage: string,
  domain: string | null | undefined,
  depth: string
): string {
  const lang = findLanguage(targetLanguage);
  const dom = findDomain(domain);
  return [
    "TARGET LANGUAGE: " + (lang ? lang.name + " (" + lang.nativeName + ")" : targetLanguage),
    lang ? lang.directive : "Preserve register, idiom, and cultural nuance in the target language.",
    "DOMAIN: " + dom.name,
    dom.directive,
    "COMPREHENSION DEPTH: " + depth,
    IDIOM_GUARD,
  ].join("\n\n");
}
