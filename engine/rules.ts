import type { RuleDefinition } from "./types";

/** Catalog of enforceable STE-aligned writing rules. */
export const STE_RULES: RuleDefinition[] = [
  {
    id: "STE-S1",
    name: "Sentence length",
    category: "sentences",
    severity: "error",
    summary:
      "Keep procedure sentences to 20 words or fewer. Keep descriptive sentences to 25 words or fewer.",
    steReference: "Writing Rules — Sentence length",
  },
  {
    id: "STE-S2",
    name: "One instruction per sentence",
    category: "sentences",
    severity: "error",
    summary:
      "Write only one instruction or one complete thought in each sentence. Split compound commands.",
    steReference: "Writing Rules — One topic / command per sentence",
  },
  {
    id: "STE-S3",
    name: "Active voice",
    category: "verbs",
    severity: "warning",
    summary: "Use active voice. Prefer 'Do X' over 'X is done'.",
    steReference: "Writing Rules — Active voice",
  },
  {
    id: "STE-S4",
    name: "Approved vocabulary",
    category: "words",
    severity: "error",
    summary:
      "Use simple approved words. Prefer STE-aligned substitutions for complex or multi-meaning terms.",
    steReference: "Dictionary + Writing Rules — Approved words",
  },
  {
    id: "STE-S5",
    name: "Noun cluster limit",
    category: "nouns",
    severity: "warning",
    summary: "Do not write more than three nouns in a row without a preposition or article break.",
    steReference: "Writing Rules — Noun clusters",
  },
  {
    id: "STE-S6",
    name: "No contractions",
    category: "words",
    severity: "error",
    summary: "Write full forms. Do not use contractions (don't → do not).",
    steReference: "Writing Rules — Full forms",
  },
  {
    id: "STE-S7",
    name: "Avoid Latin abbreviations",
    category: "punctuation",
    severity: "warning",
    summary: "Do not use e.g., i.e., etc., viz. Write the full English form.",
    steReference: "Writing Rules — Abbreviations",
  },
  {
    id: "STE-S8",
    name: "Avoid vague words",
    category: "words",
    severity: "warning",
    summary: "Avoid vague modifiers (very, quite, maybe, generally). Use precise terms.",
    steReference: "Writing Rules — Precision",
  },
  {
    id: "STE-S9",
    name: "Strong procedure verbs",
    category: "verbs",
    severity: "error",
    summary:
      "In procedures, do not use weak modals (should, could, might, may). Use must, or write an imperative.",
    steReference: "Writing Rules — Imperative mood",
  },
  {
    id: "STE-S10",
    name: "No parenthetical asides",
    category: "punctuation",
    severity: "warning",
    summary: "Avoid parentheses for secondary information in procedures. Put the data in a new sentence or a table.",
    steReference: "Writing Rules — Parentheses",
  },
  {
    id: "STE-S11",
    name: "No semicolons",
    category: "punctuation",
    severity: "warning",
    summary: "Do not use semicolons to join ideas. Write two sentences.",
    steReference: "Writing Rules — Punctuation",
  },
  {
    id: "STE-S12",
    name: "Avoid multi-clause connectors",
    category: "sentences",
    severity: "warning",
    summary:
      "Avoid long sentences joined by and/but/or/while that create two full commands or ideas.",
    steReference: "Writing Rules — Connecting words",
  },
  {
    id: "STE-S13",
    name: "Avoid phrasal verbs",
    category: "verbs",
    severity: "warning",
    summary: "Prefer single-word verbs (remove, install, examine) over multi-word phrasal verbs.",
    steReference: "Dictionary — Verb forms",
  },
  {
    id: "STE-S14",
    name: "Consistent terminology",
    category: "style",
    severity: "info",
    summary: "Use one approved word for one meaning throughout the document.",
    steReference: "Writing Rules — Consistency",
  },
  {
    id: "STE-S15",
    name: "Avoid relative clause packing",
    category: "sentences",
    severity: "info",
    summary: "Avoid packing extra information into which/that clauses. Prefer short sentences.",
    steReference: "Writing Rules — Relative clauses",
  },
];

export const RULE_BY_ID = Object.fromEntries(STE_RULES.map((r) => [r.id, r])) as Record<
  string,
  RuleDefinition
>;
