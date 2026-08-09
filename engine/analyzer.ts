import {
  CONTRACTIONS,
  LATIN_ABBREVS,
  PHRASE_SUBSTITUTIONS,
  VAGUE_WORDS,
  WEAK_MODALS,
  WORD_SUBSTITUTIONS,
} from "./dictionary";
import { RULE_BY_ID } from "./rules";
import type { AnalysisResult, DocMode, Issue, Severity } from "./types";

type Sentence = {
  text: string;
  start: number;
  end: number;
};

function lineCol(text: string, index: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

function wordCount(sentence: string): number {
  const tokens = sentence
    .replace(/[^\w\s'-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return tokens.length;
}

function splitSentences(text: string): Sentence[] {
  const results: Sentence[] = [];
  // Split on . ! ? while keeping offsets; ignore decimals and abbreviations crudely
  const re = /[^.!?\n]+(?:[.!?]+|$)|(?:\n+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    if (/^\n+$/.test(raw)) continue;
    const trimmedStart = raw.search(/\S/);
    if (trimmedStart < 0) continue;
    const start = m.index + trimmedStart;
    const end = m.index + raw.length;
    const sentenceText = text.slice(start, end).trim();
    if (!sentenceText) continue;
    results.push({ text: sentenceText, start, end });
  }
  return results;
}

function detectMode(text: string, mode: DocMode): "procedure" | "description" {
  if (mode === "procedure" || mode === "description") return mode;
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let procedureSignals = 0;
  let descriptionSignals = 0;
  for (const line of lines) {
    if (/^\d+[\).\]]\s/.test(line) || /^[-*•]\s/.test(line)) procedureSignals += 2;
    if (/^(do|remove|install|check|set|press|turn|open|close|disconnect|connect|replace|clean|inspect|verify|make sure|ensure)\b/i.test(line)) {
      procedureSignals += 2;
    }
    if (/\b(is|are|was|were|has|have|consists|includes|provides)\b/i.test(line)) {
      descriptionSignals += 1;
    }
  }
  return procedureSignals >= descriptionSignals ? "procedure" : "description";
}

function makeIssue(
  text: string,
  partial: {
    id: string;
    ruleId: string;
    start: number;
    end: number;
    message: string;
    suggestion: string;
    severity?: Severity;
  },
): Issue {
  const rule = RULE_BY_ID[partial.ruleId];
  const { line, column } = lineCol(text, partial.start);
  const snippet = text.slice(partial.start, partial.end).trim().slice(0, 120);
  return {
    id: partial.id,
    ruleId: partial.ruleId,
    ruleName: rule?.name ?? partial.ruleId,
    severity: partial.severity ?? rule?.severity ?? "warning",
    message: partial.message,
    suggestion: partial.suggestion,
    start: partial.start,
    end: partial.end,
    line,
    column,
    snippet,
  };
}

function countImperativeVerbs(sentence: string): number {
  // Heuristic: count "and/then/or" joined command-like phrases
  const parts = sentence.split(/\s+(?:and|then|or)\s+/i);
  if (parts.length < 2) return 1;
  let cmds = 0;
  for (const p of parts) {
    if (/^(do|remove|install|check|set|press|turn|open|close|disconnect|connect|replace|clean|inspect|verify|make|ensure|select|push|pull|hold|release|tighten|loosen|apply|drain|fill|measure|record|adjust|align|secure|torque|lubricate|start|stop)\b/i.test(p.trim())) {
      cmds++;
    }
  }
  return Math.max(1, cmds);
}

function isPassive(sentence: string): boolean {
  // is/are/was/were + past participle (word ending in ed, or common irregulars)
  return /\b(?:is|are|was|were|be|been|being)\s+(?:\w+ed|done|made|taken|given|written|shown|found|put|set|kept|held|built|sent|left|known|seen|thought|brought|begun)\b/i.test(
    sentence,
  );
}

function nounClusterHits(sentence: string, offset: number, text: string, issues: Issue[], counter: { n: number }) {
  // Sequence of 4+ capitalized or lowercase content words that look like nouns (no small function words)
  const tokens: Array<{ word: string; start: number }> = [];
  const re = /\b[A-Za-z][A-Za-z0-9-]*\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    tokens.push({ word: m[0], start: offset + m.index });
  }
  const stop = new Set([
    "a","an","the","of","to","in","on","for","and","or","but","with","by","from","as","at","is","are","was","were","be","been","being","this","that","these","those","it","its","if","when","while","then","than","into","onto","over","under","after","before","between","through","during","without","within","about","above","below","each","any","all","some","no","not","do","does","did","must","can","will","shall","may","might","should","could","would","you","your","we","our","they","their","he","she","him","her","his","them","my","me","i","us",
  ]);
  let run = 0;
  let runStart = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    const lower = t.word.toLowerCase();
    if (stop.has(lower) || /^\d/.test(t.word)) {
      if (run >= 4) {
        const endTok = tokens[i - 1]!;
        issues.push(
          makeIssue(text, {
            id: `noun-${counter.n++}`,
            ruleId: "STE-S5",
            start: runStart,
            end: endTok.start + endTok.word.length,
            message: `Noun cluster of ${run} words is too long (max 3).`,
            suggestion: "Break the cluster with a preposition or rewrite as shorter phrases.",
          }),
        );
      }
      run = 0;
      continue;
    }
    if (run === 0) runStart = t.start;
    run++;
  }
  if (run >= 4) {
    const endTok = tokens[tokens.length - 1]!;
    issues.push(
      makeIssue(text, {
        id: `noun-${counter.n++}`,
        ruleId: "STE-S5",
        start: runStart,
        end: endTok.start + endTok.word.length,
        message: `Noun cluster of ${run} words is too long (max 3).`,
        suggestion: "Break the cluster with a preposition or rewrite as shorter phrases.",
      }),
    );
  }
}

export function analyzeText(text: string, mode: DocMode = "auto"): AnalysisResult {
  const resolvedMode = detectMode(text, mode);
  const sentences = splitSentences(text);
  const issues: Issue[] = [];
  const counter = { n: 0 };
  const maxWords = resolvedMode === "procedure" ? 20 : 25;

  // Global phrase / word substitutions
  const phrases = [...PHRASE_SUBSTITUTIONS].sort(
    (a, b) => b.unapproved.length - a.unapproved.length,
  );
  for (const entry of phrases) {
    if (entry.unapproved === entry.approved && !entry.note) continue;
    const re = new RegExp(`\\b${escapeRegExp(entry.unapproved)}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const isPhrasal =
        entry.unapproved.includes(" ") &&
        /^(set up|shut down|turn on|turn off|look at|find out|put on|take off|take out|put in|go back|come back|carry out)$/i.test(
          entry.unapproved,
        );
      issues.push(
        makeIssue(text, {
          id: `vocab-${counter.n++}`,
          ruleId: isPhrasal ? "STE-S13" : "STE-S4",
          start: m.index,
          end: m.index + m[0].length,
          message: `"${m[0]}" is not preferred STE vocabulary.`,
          suggestion: entry.note
            ? `Prefer: ${entry.approved}. ${entry.note}`
            : `Prefer: ${entry.approved}`,
        }),
      );
    }
  }

  // Single-word substitutions (skip if already covered by phrase match roughly)
  const seenWordSpans = new Set(issues.map((i) => `${i.start}-${i.end}`));
  for (const entry of WORD_SUBSTITUTIONS) {
    if (entry.unapproved === entry.approved && !entry.note) continue;
    const re = new RegExp(`\\b${escapeRegExp(entry.unapproved)}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const key = `${m.index}-${m.index + m[0].length}`;
      if (seenWordSpans.has(key)) continue;
      // Skip if inside a longer phrase issue
      const overlaps = issues.some(
        (i) => m!.index >= i.start && m!.index + m![0].length <= i.end && i.ruleId === "STE-S4",
      );
      if (overlaps) continue;
      seenWordSpans.add(key);
      issues.push(
        makeIssue(text, {
          id: `word-${counter.n++}`,
          ruleId: "STE-S4",
          start: m.index,
          end: m.index + m[0].length,
          message: `"${m[0]}" is not preferred STE vocabulary.`,
          suggestion: entry.note
            ? `Prefer: ${entry.approved}. ${entry.note}`
            : `Prefer: ${entry.approved}`,
        }),
      );
    }
  }

  // Contractions
  for (const c of CONTRACTIONS) {
    let m: RegExpExecArray | null;
    const re = new RegExp(c.pattern.source, c.pattern.flags);
    while ((m = re.exec(text)) !== null) {
      issues.push(
        makeIssue(text, {
          id: `contr-${counter.n++}`,
          ruleId: "STE-S6",
          start: m.index,
          end: m.index + m[0].length,
          message: `Contraction "${m[0]}" is not allowed.`,
          suggestion: `Write the full form: ${c.full}`,
        }),
      );
    }
  }

  // Latin abbreviations
  for (const la of LATIN_ABBREVS) {
    let m: RegExpExecArray | null;
    const re = new RegExp(la.pattern.source, la.pattern.flags);
    while ((m = re.exec(text)) !== null) {
      issues.push(
        makeIssue(text, {
          id: `latin-${counter.n++}`,
          ruleId: "STE-S7",
          start: m.index,
          end: m.index + m[0].length,
          message: `Latin abbreviation "${m[0]}" is not preferred.`,
          suggestion: `Write: ${la.approved}`,
        }),
      );
    }
  }

  // Vague words
  {
    const re = /\b[A-Za-z']+\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const w = m[0].toLowerCase();
      if (VAGUE_WORDS.has(w)) {
        issues.push(
          makeIssue(text, {
            id: `vague-${counter.n++}`,
            ruleId: "STE-S8",
            start: m.index,
            end: m.index + m[0].length,
            message: `"${m[0]}" is vague.`,
            suggestion: "Use a precise word or remove the modifier.",
          }),
        );
      }
    }
  }

  // Semicolons
  {
    let idx = text.indexOf(";");
    while (idx !== -1) {
      issues.push(
        makeIssue(text, {
          id: `semi-${counter.n++}`,
          ruleId: "STE-S11",
          start: idx,
          end: idx + 1,
          message: "Semicolons are discouraged in STE.",
          suggestion: "Split into two sentences with a period.",
        }),
      );
      idx = text.indexOf(";", idx + 1);
    }
  }

  // Parentheses in procedure mode
  if (resolvedMode === "procedure") {
    const re = /\([^)]+\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      issues.push(
        makeIssue(text, {
          id: `paren-${counter.n++}`,
          ruleId: "STE-S10",
          start: m.index,
          end: m.index + m[0].length,
          message: "Parentheses are discouraged in procedure text.",
          suggestion: "Move the information into a new sentence or a table.",
        }),
      );
    }
  }

  // Sentence-level rules
  const sentenceBreakdown: AnalysisResult["sentenceBreakdown"] = [];

  for (const s of sentences) {
    const sIssues: Issue[] = [];
    const wc = wordCount(s.text);

    if (wc > maxWords) {
      const issue = makeIssue(text, {
        id: `len-${counter.n++}`,
        ruleId: "STE-S1",
        start: s.start,
        end: s.end,
        message: `Sentence has ${wc} words (limit ${maxWords} for ${resolvedMode}).`,
        suggestion: "Split into shorter sentences. Keep one idea per sentence.",
      });
      issues.push(issue);
      sIssues.push(issue);
    }

    if (resolvedMode === "procedure" && countImperativeVerbs(s.text) >= 2) {
      const issue = makeIssue(text, {
        id: `multi-${counter.n++}`,
        ruleId: "STE-S2",
        start: s.start,
        end: s.end,
        message: "Sentence appears to contain more than one instruction.",
        suggestion: "Write one instruction per sentence.",
      });
      issues.push(issue);
      sIssues.push(issue);
    }

    if (isPassive(s.text)) {
      const issue = makeIssue(text, {
        id: `pass-${counter.n++}`,
        ruleId: "STE-S3",
        start: s.start,
        end: s.end,
        message: "Passive voice detected.",
        suggestion: "Rewrite in active voice. Name the actor and the action.",
      });
      issues.push(issue);
      sIssues.push(issue);
    }

    if (resolvedMode === "procedure") {
      const re = /\b(should|could|might|may|would|ought)\b/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s.text)) !== null) {
        if (!WEAK_MODALS.has(m[0].toLowerCase())) continue;
        const issue = makeIssue(text, {
          id: `modal-${counter.n++}`,
          ruleId: "STE-S9",
          start: s.start + m.index,
          end: s.start + m.index + m[0].length,
          message: `Weak modal "${m[0]}" in procedure text.`,
          suggestion: 'Use "must" or write an imperative command (e.g. "Do X").',
        });
        issues.push(issue);
        sIssues.push(issue);
      }
    }

    // Compound connectors heuristic
    if (
      wc > 12 &&
      /\b(?:and|but|or|while|although|because|whereas)\b/i.test(s.text) &&
      /,\s*(?:and|but|or)\b/i.test(s.text)
    ) {
      const issue = makeIssue(text, {
        id: `conn-${counter.n++}`,
        ruleId: "STE-S12",
        start: s.start,
        end: s.end,
        message: "Sentence joins multiple ideas with connecting words.",
        suggestion: "Split into separate short sentences.",
      });
      issues.push(issue);
      sIssues.push(issue);
    }

    // Relative clauses
    if (/\b(?:which|that)\b/i.test(s.text) && wc > 15) {
      const issue = makeIssue(text, {
        id: `rel-${counter.n++}`,
        ruleId: "STE-S15",
        start: s.start,
        end: s.end,
        message: "Long sentence with a relative clause (which/that).",
        suggestion: "Move the extra information into a new sentence.",
      });
      issues.push(issue);
      sIssues.push(issue);
    }

    nounClusterHits(s.text, s.start, text, issues, counter);

    sentenceBreakdown.push({
      text: s.text,
      start: s.start,
      end: s.end,
      wordCount: wc,
      issues: sIssues,
    });
  }

  // Consistency: near-synonym pairs used together
  const synonymGroups = [
    ["use", "utilize", "utilise", "employ"],
    ["start", "commence", "initiate", "begin"],
    ["stop", "terminate", "cease", "end"],
    ["show", "indicate", "demonstrate", "exhibit"],
    ["remove", "eliminate", "delete"],
    ["change", "modify", "alter"],
  ];
  const lowerText = text.toLowerCase();
  for (const group of synonymGroups) {
    const found = group.filter((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, "i").test(lowerText));
    if (found.length >= 2) {
      issues.push(
        makeIssue(text, {
          id: `cons-${counter.n++}`,
          ruleId: "STE-S14",
          start: 0,
          end: Math.min(text.length, 1),
          message: `Document mixes related terms: ${found.join(", ")}.`,
          suggestion: `Pick one approved term (prefer "${group[0]}") and use it consistently.`,
          severity: "info",
        }),
      );
    }
  }

  // Deduplicate overlapping identical rule+span
  const deduped: Issue[] = [];
  const keys = new Set<string>();
  for (const issue of issues) {
    const k = `${issue.ruleId}:${issue.start}:${issue.end}:${issue.message}`;
    if (keys.has(k)) continue;
    keys.add(k);
    deduped.push(issue);
  }

  // Sort by position
  deduped.sort((a, b) => a.start - b.start || a.end - b.end);

  const errors = deduped.filter((i) => i.severity === "error").length;
  const warnings = deduped.filter((i) => i.severity === "warning").length;
  const infos = deduped.filter((i) => i.severity === "info").length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length || (text.trim() ? 1 : 0);

  // Score 0-100
  const penalty = errors * 8 + warnings * 3 + infos * 1;
  const score = words === 0 ? 100 : Math.max(0, Math.min(100, 100 - penalty));

  return {
    text,
    mode,
    resolvedMode,
    issues: deduped,
    stats: {
      sentences: sentences.length,
      words,
      paragraphs,
      errors,
      warnings,
      infos,
      score,
    },
    sentenceBreakdown,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Apply simple automatic fixes where a clear substitution exists. */
export function applySafeFixes(text: string): string {
  let out = text;
  for (const c of CONTRACTIONS) {
    out = out.replace(c.pattern, c.full);
  }
  for (const la of LATIN_ABBREVS) {
    out = out.replace(la.pattern, la.approved);
  }
  const phrases = [...PHRASE_SUBSTITUTIONS].sort(
    (a, b) => b.unapproved.length - a.unapproved.length,
  );
  for (const entry of phrases) {
    if (entry.unapproved === entry.approved) continue;
    const re = new RegExp(`\\b${escapeRegExp(entry.unapproved)}\\b`, "gi");
    out = out.replace(re, (match) => preserveCase(match, entry.approved));
  }
  for (const entry of WORD_SUBSTITUTIONS) {
    if (entry.unapproved === entry.approved) continue;
    const re = new RegExp(`\\b${escapeRegExp(entry.unapproved)}\\b`, "gi");
    out = out.replace(re, (match) => preserveCase(match, entry.approved));
  }
  out = out.replace(/;/g, ".");
  return out;
}

function preserveCase(original: string, replacement: string): string {
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (original[0] && original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export const SAMPLE_BAD = `In order to commence the procedure, the technician should make sure that the aircraft maintenance manual is utilized and that all the necessary tooling components are obtained prior to initiating any work.

1. The circuit breaker is set to the OFF position and the power supply is disconnected (see Fig. 3).
2. Remove the access panel and inspect the hydraulic system pressure indicator assembly carefully, and then clean the filter if it's dirty.
3. Don't utilize the incorrect fastener; e.g., only use the approved bolt which is specified in the subsequent section of the documentation.

The system is designed to facilitate rapid troubleshooting and it will generally provide very good functionality if the technician performs the checks correctly.`;

export const SAMPLE_GOOD = `Do this procedure to prepare the aircraft for hydraulic filter maintenance.

1. Set the circuit breaker to OFF.
2. Disconnect the power supply.
3. Remove the access panel.
4. Examine the hydraulic pressure indicator.
5. If the filter is dirty, clean the filter.
6. Install only the approved bolt. The approved bolt is given in the next section.

This system helps you find faults quickly. Do the checks correctly.`;
