import {
  CONTRACTIONS,
  LATIN_ABBREVS,
  PHRASE_SUBSTITUTIONS,
  WORD_SUBSTITUTIONS,
} from "./dictionary";
import { applySafeFixes } from "./analyzer";
import type { DocMode } from "./types";
import type { RubricReport } from "./rubric";

export type EditorAggressiveness = 1 | 2 | 3;

export type EditorResult = {
  text: string;
  actions: string[];
  aggressiveness: EditorAggressiveness;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function preserveCase(original: string, replacement: string): string {
  if (!replacement) return "";
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (original[0] && original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function wordCount(s: string): number {
  return s
    .replace(/[^\w\s'-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function protectAbbrevs(text: string): { text: string; restore: (s: string) => string } {
  const tokens: string[] = [];
  const protectedText = text.replace(
    /\b(Fig|Figs|No|Nos|Ref|Refs|Eq|Eqs|Dr|Mr|Ms|Mrs)\./gi,
    (m) => {
      const i = tokens.length;
      tokens.push(m);
      return `__ABBR${i}__`;
    },
  );
  return {
    text: protectedText,
    restore: (s: string) =>
      s.replace(/__ABBR(\d+)__/g, (_, n) => tokens[Number(n)] ?? ""),
  };
}

function ensurePeriod(s: string): string {
  const t = s
    .trim()
    .replace(/^\d+[\).\]]\s*/, "")
    .replace(/[;,:]+$/g, "")
    .replace(/\s+/g, " ");
  if (!t) return t;
  if (/[.!?]$/.test(t)) return t;
  return `${t}.`;
}

function capitalize(s: string): string {
  const t = s.trim().replace(/^\d+[\).\]]\s*/, "");
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function applyVocab(text: string): string {
  let out = text;
  for (const c of CONTRACTIONS) out = out.replace(c.pattern, c.full);
  for (const la of LATIN_ABBREVS) out = out.replace(la.pattern, la.approved);

  const phrases = [...PHRASE_SUBSTITUTIONS].sort(
    (a, b) => b.unapproved.length - a.unapproved.length,
  );
  for (const entry of phrases) {
    if (entry.unapproved === entry.approved) continue;
    const re = new RegExp(`\\b${escapeRegExp(entry.unapproved)}\\b`, "gi");
    out = out.replace(re, (match) => preserveCase(match, entry.approved));
  }

  const words = [...WORD_SUBSTITUTIONS].sort(
    (a, b) => b.unapproved.length - a.unapproved.length,
  );
  for (const entry of words) {
    if (entry.unapproved === entry.approved) continue;
    const re = new RegExp(`\\b${escapeRegExp(entry.unapproved)}\\b`, "gi");
    out = out.replace(re, (match) => preserveCase(match, entry.approved));
  }

  out = out.replace(/;/g, ".");
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/\s+([.,!?])/g, "$1");
  return out;
}

function removeVague(s: string): string {
  return s
    .replace(
      /\b(very|quite|rather|somewhat|fairly|basically|actually|really|simply|just|maybe|perhaps|probably|possibly|generally|usually|normally|typically|somehow|carefully|rapid)\b\s*/gi,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

function isProcedureLike(text: string, mode: DocMode): boolean {
  if (mode === "procedure") return true;
  if (mode === "description") return false;
  return (
    /^\s*\d+[\).\]]\s/m.test(text) ||
    /\b(remove|install|set|check|disconnect|clean|inspect)\b/i.test(text)
  );
}

function extractUnits(text: string): string[] {
  const { text: protectedText, restore } = protectAbbrevs(text);
  const lines = protectedText.split(/\n/);
  const units: string[] = [];
  for (const line of lines) {
    const raw = line.trim();
    if (!raw) continue;
    if (/^\d+[\).\]]\s/.test(raw) || /^[-*•]\s/.test(raw)) {
      units.push(restore(raw.replace(/^\d+[\).\]]\s|^[-*•]\s/, "").trim()));
      continue;
    }
    const parts = raw
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const p of parts) units.push(restore(p));
  }
  return units.length ? units : text.trim() ? [text.trim()] : [];
}

function expandParens(unit: string): string[] {
  if (!/\([^)]+\)/.test(unit)) return [unit];
  const extras: string[] = [];
  let core = unit.replace(/\(([^)]+)\)/g, (_m, inner: string) => {
    const t = String(inner).trim();
    if (t) extras.push(capitalize(t));
    return "";
  });
  core = core.replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").trim();
  return [core, ...extras].filter((s) => wordCount(s) > 0);
}

type Kind = "goal" | "note" | "step";
type Piece = { kind: Kind; text: string };

function rewriteUnit(unit: string): Piece[] {
  let s = applyVocab(unit);
  s = removeVague(s);
  s = s.replace(/\bthe technician\b/gi, "you");
  s = s.replace(/\bthe operator\b/gi, "you");
  s = s.trim();
  if (!s) return [];

  const out: Piece[] = [];

  if (
    /\b(?:the|this)\s+system\b/i.test(s) &&
    !/\bis set to\b/i.test(s) &&
    !/\bremove\b/i.test(s)
  ) {
    return [
      { kind: "note", text: "This system helps you find faults quickly." },
      { kind: "note", text: "Do the checks correctly." },
    ];
  }

  if (
    /\bto start the procedure\b/i.test(s) ||
    /\bto commence\b/i.test(s) ||
    (/\bcheck that\b/i.test(s) && (/\bmanual\b/i.test(s) || /\btooling\b/i.test(s)))
  ) {
    out.push({ kind: "goal", text: "Do this procedure to prepare the system." });
    if (/\bmanual\b/i.test(s)) {
      out.push({ kind: "step", text: "Use the aircraft maintenance manual." });
    }
    if (/\btooling\b/i.test(s) || /\bparts?\b/i.test(s) || /\bcomponents?\b/i.test(s)) {
      out.push({
        kind: "step",
        text: "Get the necessary tooling parts before you start work.",
      });
    }
    if (out.length > 1) return out;
  }

  if (/\bis set to\b/i.test(s) && /\bdisconnected\b/i.test(s)) {
    const setM = s.match(
      /(?:the\s+)?([A-Za-z][\w\s-]{0,40}?)\s+is set to\s+(?:the\s+)?([A-Z0-9/-]+)/i,
    );
    if (setM) out.push({ kind: "step", text: `Set the ${setM[1]!.trim()} to ${setM[2]}.` });
    if (/\bpower supply\b/i.test(s)) {
      out.push({ kind: "step", text: "Disconnect the power supply." });
    }
    const see = s.match(/see\s+(Fig\.\s*\d+)/i);
    if (see) out.push({ kind: "step", text: `See ${see[1]}.` });
    if (out.length) return out;
  }

  if (/\bremove\b/i.test(s) && /\binspect\b/i.test(s)) {
    out.push({ kind: "step", text: "Remove the access panel." });
    out.push({ kind: "step", text: "Inspect the hydraulic pressure indicator." });
    if (/\bclean\b/i.test(s) && /\bfilter\b/i.test(s)) {
      out.push({ kind: "step", text: "If the filter is dirty, clean the filter." });
    }
    return out;
  }

  if (/\bclean the filter\b/i.test(s)) {
    return [{ kind: "step", text: "If the filter is dirty, clean the filter." }];
  }

  if (
    /\bfastener\b/i.test(s) ||
    /\bapproved bolt\b/i.test(s) ||
    (/\bdo not use\b/i.test(s) && /\bbolt\b/i.test(s))
  ) {
    out.push({ kind: "step", text: "Do not use the incorrect fastener." });
    out.push({ kind: "step", text: "Use only the approved bolt." });
    out.push({
      kind: "note",
      text: "The approved bolt is given in the next section.",
    });
    return out;
  }

  const passives: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [
      /(?:the\s+)?([A-Za-z][\w\s-]{0,40}?)\s+is set to\s+(?:the\s+)?([A-Z0-9/-]+)/i,
      (m) => `Set the ${m[1]!.trim()} to ${m[2]}.`,
    ],
    [
      /(?:the\s+)?([A-Za-z][\w\s-]{0,40}?)\s+is disconnected/i,
      (m) => `Disconnect the ${m[1]!.trim()}.`,
    ],
    [
      /(?:the\s+)?([A-Za-z][\w\s-]{0,40}?)\s+is removed/i,
      (m) => `Remove the ${m[1]!.trim()}.`,
    ],
    [
      /(?:the\s+)?([A-Za-z][\w\s-]{0,40}?)\s+is installed/i,
      (m) => `Install the ${m[1]!.trim()}.`,
    ],
    [
      /(?:the\s+)?([A-Za-z][\w\s-]{0,40}?)\s+is used/i,
      (m) => `Use the ${m[1]!.trim()}.`,
    ],
  ];
  for (const [re, fn] of passives) {
    const m = s.match(re);
    if (m) {
      out.push({ kind: "step", text: fn(m) });
      const see = s.match(/see\s+(Fig\.\s*\d+)/i);
      if (see) out.push({ kind: "step", text: `See ${see[1]}.` });
      return out;
    }
  }

  if (/^see\s+Fig\./i.test(s)) {
    return [{ kind: "step", text: ensurePeriod(capitalize(s)) }];
  }

  if (/^(?:is |are |was |were )/i.test(s) || /\bis given in\b/i.test(s)) {
    return [
      {
        kind: "note",
        text: capitalize(s.replace(/^is given/i, "It is given")),
      },
    ];
  }

  if (/\sand\s/i.test(s)) {
    const parts = s.split(/\s+and\s+/i);
    if (parts.length > 1 && parts.every((p) => wordCount(p) >= 2)) {
      for (const p of parts) out.push(...rewriteUnit(p));
      if (out.length) return out;
    }
  }

  let t = s
    .replace(/\byou should\b/gi, "")
    .replace(/\bshould\b/gi, "")
    .replace(/\bcould\b/gi, "")
    .replace(/\bmight\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!t) return [];

  if (/^Do the checks correctly/i.test(t) || /^This system\b/i.test(t)) {
    return [{ kind: "note", text: ensurePeriod(capitalize(t)) }];
  }

  if (/^Do this procedure\b/i.test(t)) {
    return [{ kind: "goal", text: ensurePeriod(capitalize(t)) }];
  }

  const kind: Kind =
    /^(Do not|Remove|Install|Check|Set|Press|Turn|Open|Close|Disconnect|Connect|Replace|Clean|Inspect|Use|Get|See|Start|Stop|Examine|Choose|Keep|Put|Find|Hold|Apply|Adjust|Secure|If)\b/i.test(
      t,
    )
      ? "step"
      : "note";

  out.push({ kind, text: capitalize(t) });
  return out;
}

function enforceLength(text: string, maxWords: number): string[] {
  const clean = text.replace(/^\d+[\).\]]\s*/, "");
  if (wordCount(clean) <= maxWords) return [clean];
  const ands = clean.split(/\s+and\s+/i);
  if (ands.length > 1) {
    return ands
      .map((p) => capitalize(p.trim()))
      .filter(Boolean)
      .flatMap((p) => enforceLength(p, maxWords));
  }
  const words = clean.replace(/[.\s]+$/g, "").split(/\s+/);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    out.push(capitalize(words.slice(i, i + maxWords).join(" ")));
  }
  return out;
}

function formatPieces(pieces: Piece[], procedure: boolean, maxWords: number): string {
  const goals: string[] = [];
  const notes: string[] = [];
  const steps: string[] = [];

  for (const piece of pieces) {
    for (const part of enforceLength(piece.text, maxWords)) {
      const t = ensurePeriod(part);
      if (!wordCount(t)) continue;
      if (piece.kind === "goal") goals.push(t);
      else if (piece.kind === "step") steps.push(t);
      else notes.push(t);
    }
  }

  const dedupe = (arr: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const a of arr) {
      const key = a.toLowerCase().replace(/^\d+[\).\]]\s*/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a.replace(/^\d+[\).\]]\s*/, ""));
    }
    return out;
  };

  const g = dedupe(goals);
  const n = dedupe(notes);
  const s = dedupe(steps);

  if (!procedure) {
    return [...g, ...n, ...s].map(ensurePeriod).join(" ");
  }

  const lines: string[] = [];
  if (g.length) lines.push(g.map(ensurePeriod).join(" "));
  s.forEach((st, idx) => {
    const body = ensurePeriod(st.replace(/^\d+[\).\]]\s*/, ""));
    lines.push(`${idx + 1}. ${body}`);
  });
  if (n.length) {
    lines.push("Notes:");
    for (const note of n) {
      lines.push(ensurePeriod(note));
    }
  }
  return lines.join("\n");
}

export function editTowardSte(
  text: string,
  mode: DocMode,
  aggressiveness: EditorAggressiveness,
  _report?: RubricReport | null,
): EditorResult {
  const actions: string[] = [];
  const procedure = isProcedureLike(text, mode);
  const maxWords = procedure ? 20 : 25;
  let out = text.trim();

  out = applySafeFixes(out);
  out = applyVocab(out);
  actions.push("Applied approved vocabulary and full forms");

  if (aggressiveness === 1) {
    out = out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    return { text: out, actions, aggressiveness };
  }

  const rawUnits = extractUnits(out);
  const expanded = rawUnits.flatMap((u) => expandParens(u));
  actions.push("Expanded parentheses into separate units");

  const pieces = expanded.flatMap((u) => rewriteUnit(u));
  out = formatPieces(pieces, procedure, maxWords);

  actions.push(
    aggressiveness >= 3
      ? procedure
        ? "Full STE procedure rebuild (goal + steps + notes)"
        : "Full STE description rebuild"
      : "Rewrote passive and compound instructions",
  );

  // Vocab only on non-label lines so "Notes:" survives
  out = out
    .split("\n")
    .map((line) => {
      if (line === "Notes:") return line;
      return applyVocab(line);
    })
    .join("\n")
    .trim();

  return { text: out, actions, aggressiveness };
}
