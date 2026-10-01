// The reader's verbs.
//
// A text arrives with a language and a domain already decided. Until now that
// was the whole story: the reader could only point at bytes and say
// "understand", paying the full comprehension price for a dictionary lookup.
//
// An action decides WHAT to do; the scope decides WHAT to do it to. They are
// orthogonal on purpose — a definition belongs on a word, a summary on a whole
// text, and both are the same machinery.
//
// Every action declares the sections it emits and the marker each one uses.
// The markers are the wire format and they map onto fixed storage slots, so a
// new action is a config addition, never a schema change.

export type Scope = "word" | "sentence" | "passage" | "text";

/** Wire markers. Each maps onto one fixed storage column (see SLOT). */
export type Marker =
  | "ORIGINAL"
  | "UNDERSTANDING"
  | "TERMS"
  | "KEYIDEA"
  | "EXPLANATION"
  | "SENSE"
  | "HARD";

/** Which stored column a marker fills. Two markers share a column by design. */
export const SLOT: Record<Marker, "original" | "understanding" | "terms" | "keyIdea" | "explanation"> = {
  ORIGINAL: "original",
  UNDERSTANDING: "understanding",
  TERMS: "terms",
  KEYIDEA: "keyIdea",
  EXPLANATION: "explanation",
  SENSE: "understanding",
  HARD: "terms",
};

export interface ActionSection {
  name: Marker;
  /** How the reader sees it. The wire marker is never shown. */
  label: string;
  kind: "text" | "list";
  /** The line that tells the model what belongs here. */
  spec: string;
}

export interface ActionVariant {
  system: string;
  /** How the passage is introduced to the model. */
  sourceLabel: string;
  sections: ActionSection[];
}

export interface ReadingAction {
  id: string;
  label: string;
  /** One line, shown under the label. Says what the reader gets. */
  hint: string;
  scopes: Scope[];
  /** Used for word, sentence and passage scopes. */
  passage: ActionVariant;
  /** Used for a whole text. Absent means the action is not offered there. */
  text?: ActionVariant;
}

const NO_GUESS =
  "If you cannot identify the source language with confidence, say so plainly instead of guessing: a confident wrong answer costs the reader more than an honest one.";

const COMPANION =
  "You are a multilingual reading companion. Your purpose is comprehension, not literal translation.";

const FORMAT_RULE = "Follow the requested output format exactly. Output nothing outside the marked sections.";

export const ACTIONS: ReadingAction[] = [
  {
    id: "understand",
    label: "Understand",
    hint: "Meaning, terms, the point, and what a flat translation would lose",
    scopes: ["word", "sentence", "passage", "text"],
    passage: {
      system: [
        COMPANION,
        "You help a reader understand a passage written in another language: what it means, how it is built, what it implies, and what a flat translation would lose.",
        "Translate into the reader's preferred language while preserving meaning, context, tone, and nuance.",
        "Explain grammar, sentence structure, register, and implied meaning where it helps understanding.",
        "The passage may be a fragment of a longer text. Never invent context it does not carry.",
        NO_GUESS,
        FORMAT_RULE,
      ].join(" "),
      sourceLabel: "PASSAGE:",
      sections: [
        { name: "ORIGINAL", label: "Original", kind: "text", spec: "<the source passage, unchanged>" },
        { name: "UNDERSTANDING", label: "What it means", kind: "text", spec: "<the meaning-preserving rendering in the target language — NOT a word-for-word translation>" },
        { name: "TERMS", label: "Terms", kind: "list", spec: "<between one and six entries, each written as: term — short meaning; separated by semicolons>" },
        { name: "KEYIDEA", label: "The point", kind: "text", spec: "<the point of the passage, one or two sentences>" },
        { name: "EXPLANATION", label: "Why", kind: "text", spec: "<grammar, structure, register, idiom or pun handling, and implied meaning where useful>" },
      ],
    },
    text: {
      system: [
        COMPANION,
        "The reader has handed you an entire text — a chapter, an article, a page — not a snippet. Do NOT translate all of it.",
        "Give a running sense of what the text is and what it is doing, then give real help on only the genuinely hard parts.",
        "Be specific to THIS text. Never produce commentary that would fit any text equally well.",
        "If you cannot identify the source language with confidence, say so plainly instead of guessing.",
        FORMAT_RULE,
      ].join(" "),
      sourceLabel: "THE WHOLE TEXT:",
      sections: [
        { name: "SENSE", label: "The whole text", kind: "text", spec: "<2 to 4 sentences in the target language: what this text is, what it is doing, and its register or tone. Do not walk through the content point by point.>" },
        { name: "HARD", label: "The hard parts", kind: "list", spec: "<between zero and five entries, each on its own line, each written as: the exact source phrase — why it is hard and what it actually means. Include only what a careful reader would genuinely stumble on: idioms, puns, allusions, false friends, dense syntax, terminology. If there are none, write exactly: none>" },
      ],
    },
  },
  {
    id: "translate",
    label: "Translate",
    hint: "The meaning in your language, and nothing else",
    scopes: ["word", "sentence", "passage"],
    passage: {
      system: [
        COMPANION,
        "Give the reader the meaning in their language and nothing else. No commentary, no grammar, no notes.",
        "Translate for meaning, not word for word: keep the tone, the register and the force of the original.",
        "Where a literal rendering would mislead, prefer the rendering that carries what the original actually says.",
        "Never invent context the fragment does not carry.",
        NO_GUESS,
        FORMAT_RULE,
      ].join(" "),
      sourceLabel: "PASSAGE:",
      sections: [
        { name: "UNDERSTANDING", label: "Translation", kind: "text", spec: "<the meaning-preserving rendering in the target language — natural, faithful in tone and register, NOT word-for-word, and with no commentary added>" },
      ],
    },
  },
  {
    id: "simplify",
    label: "Simplify",
    hint: "The same thing, said in plainer language",
    scopes: ["sentence", "passage"],
    passage: {
      system: [
        COMPANION,
        "Rewrite the passage in the target language in plainer, simpler words, keeping the meaning intact.",
        "Shorten the sentences and remove the ornament, but never drop information the reader needs.",
        "The result should read as something a careful writer would actually produce, not as a summary.",
        NO_GUESS,
        FORMAT_RULE,
      ].join(" "),
      sourceLabel: "PASSAGE:",
      sections: [
        { name: "UNDERSTANDING", label: "In plainer language", kind: "text", spec: "<the passage rewritten in simpler language, same meaning, plainer and shorter sentences>" },
        { name: "EXPLANATION", label: "What was hard", kind: "text", spec: "<one or two sentences naming what made the original difficult — the syntax, the register, the vocabulary. Omit if the original was already plain.>" },
      ],
    },
  },
  {
    id: "grammar",
    label: "Grammar",
    hint: "How the sentence is built, and why it is built that way",
    scopes: ["word", "sentence", "passage"],
    passage: {
      system: [
        COMPANION,
        "The reader wants to understand how this is built, not simply what it says.",
        "Explain the grammar and sentence structure: the tense, mood, case, agreement, word order, and any construction that a learner would not predict.",
        "Name the construction, then say what it is doing here. Be concrete about THIS sentence, never general.",
        NO_GUESS,
        FORMAT_RULE,
      ].join(" "),
      sourceLabel: "PASSAGE:",
      sections: [
        { name: "EXPLANATION", label: "How it is built", kind: "text", spec: "<the grammar and structure of this passage: name each construction that matters and say what it does here. Concrete to this sentence, no general grammar lesson.>" },
      ],
    },
  },
  {
    id: "define",
    label: "Define",
    hint: "What this word means here — and what it does not",
    scopes: ["word", "sentence"],
    passage: {
      system: [
        COMPANION,
        "The reader has picked out a word or a short phrase and wants to know what it means in THIS place.",
        "Give the sense it carries here — not a dictionary dump of every sense it could carry.",
        "If it is an idiom, a false friend, or a word whose usual meaning would mislead here, say so explicitly.",
        "Never invent context the fragment does not carry.",
        NO_GUESS,
        FORMAT_RULE,
      ].join(" "),
      sourceLabel: "SELECTION:",
      sections: [
        { name: "UNDERSTANDING", label: "Here it means", kind: "text", spec: "<the meaning this selection carries in this place, in the target language, in one or two sentences>" },
        { name: "TERMS", label: "Also", kind: "list", spec: "<between zero and three entries covering a sense a reader might wrongly assume, a false friend, a register note, or the literal reading if this is an idiom. Each written as: term or reading — what it actually is. Write exactly none if there is nothing worth adding.>" },
        { name: "EXPLANATION", label: "Why", kind: "text", spec: "<one or two sentences on why it means this here — the grammar, the idiom, or the context that decides it>" },
      ],
    },
  },
  {
    id: "hardparts",
    label: "Hard parts",
    hint: "Only the idioms, puns and traps — nothing else",
    scopes: ["sentence", "passage", "text"],
    passage: {
      system: [
        COMPANION,
        "The reader only wants the genuinely difficult parts. Do not translate the whole passage and do not summarise it.",
        "List the phrases a careful reader would actually stumble on: idioms, puns, allusions, false friends, dense syntax, terminology.",
        "For each one, give the exact source phrase and say what it actually means. If there is nothing hard, say exactly: none.",
        NO_GUESS,
        FORMAT_RULE,
      ].join(" "),
      sourceLabel: "PASSAGE:",
      sections: [
        { name: "HARD", label: "The hard parts", kind: "list", spec: "<zero to five entries, each on its own line, each written as: the exact source phrase — why it is hard and what it actually means. If there are none, write exactly: none>" },
      ],
    },
    text: {
      system: [
        COMPANION,
        "The reader has handed you an entire text and only wants the genuinely difficult parts. Do not summarise it and do not translate it.",
        "List the phrases a careful reader would actually stumble on: idioms, puns, allusions, false friends, dense syntax, terminology.",
        "For each one, give the exact source phrase and say what it actually means. If there is nothing hard, say exactly: none.",
        NO_GUESS,
        FORMAT_RULE,
      ].join(" "),
      sourceLabel: "THE WHOLE TEXT:",
      sections: [
        { name: "HARD", label: "The hard parts", kind: "list", spec: "<zero to five entries, each on its own line, each written as: the exact source phrase — why it is hard and what it actually means. If there are none, write exactly: none>" },
      ],
    },
  },
  {
    id: "summarise",
    label: "Summarise",
    hint: "What this is and what it is doing",
    scopes: ["passage", "text"],
    passage: {
      system: [
        COMPANION,
        "Give the reader the sense of this passage, not a translation of it.",
        "Say what it is and what it is doing. Be specific to THIS passage, never general.",
        NO_GUESS,
        FORMAT_RULE,
      ].join(" "),
      sourceLabel: "PASSAGE:",
      sections: [
        { name: "SENSE", label: "In short", kind: "text", spec: "<2 to 4 sentences in the target language: what this passage says and what it is doing>" },
        { name: "KEYIDEA", label: "The point", kind: "text", spec: "<the single point the passage is making, one sentence>" },
      ],
    },
    text: {
      system: [
        COMPANION,
        "The reader has handed you an entire text. Summarise it; do not translate it and do not walk through it point by point.",
        "Be specific to THIS text. Never produce a summary that would fit any text equally well.",
        NO_GUESS,
        FORMAT_RULE,
      ].join(" "),
      sourceLabel: "THE WHOLE TEXT:",
      sections: [
        { name: "SENSE", label: "In short", kind: "text", spec: "<2 to 4 sentences in the target language: what this text is, what it is doing, and its register or tone>" },
        { name: "KEYIDEA", label: "The point", kind: "text", spec: "<the single point the text is making, one sentence>" },
      ],
    },
  },
];

export const DEFAULT_ACTION = "understand";

export function findAction(id: string | null | undefined): ReadingAction {
  return ACTIONS.find((a) => a.id === id) ?? ACTIONS[0];
}

/**
 * What the reader is pointing at, read from the length of the selection.
 * Deliberately simple: it decides which verbs to offer, and a reader who wants
 * a different one can tap the paragraph instead.
 */
export function scopeForSelection(quote: string): Scope {
  const words = quote.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 1) return "word";
  // A handful of words is a sentence however it ends; past a couple of clauses
  // the reader is pointing at a passage.
  if (words <= 12) return "sentence";
  return "passage";
}

/** The variant of an action that applies at a scope, or null if it is not offered. */
export function variantFor(action: ReadingAction, scope: Scope): ActionVariant | null {
  if (!action.scopes.includes(scope)) return null;
  return scope === "text" ? action.text ?? null : action.passage;
}

export function actionsForScope(scope: Scope): ReadingAction[] {
  return ACTIONS.filter((a) => variantFor(a, scope) !== null);
}
