import { analyzeText } from "./analyzer";
import type { AnalysisResult, DocMode, Issue } from "./types";

export type RubricCriterionId =
  | "sentence_length"
  | "instruction_atomicity"
  | "voice_and_verbs"
  | "vocabulary"
  | "form_and_punctuation"
  | "consistency_and_clarity";

export type RubricCriterion = {
  id: RubricCriterionId;
  name: string;
  weight: number;
  description: string;
  ruleIds: string[];
};

/** Adversarial scoring rubric — dimensions the critic optimizes against. */
export const RUBRIC: RubricCriterion[] = [
  {
    id: "sentence_length",
    name: "Sentence length",
    weight: 0.2,
    description: "Procedure ≤20 words; description ≤25 words. No packing.",
    ruleIds: ["STE-S1"],
  },
  {
    id: "instruction_atomicity",
    name: "One instruction",
    weight: 0.18,
    description: "One command or complete thought per sentence / step.",
    ruleIds: ["STE-S2", "STE-S12"],
  },
  {
    id: "voice_and_verbs",
    name: "Voice & verbs",
    weight: 0.18,
    description: "Active voice; strong procedure verbs; no weak modals; prefer single-word verbs.",
    ruleIds: ["STE-S3", "STE-S9", "STE-S13"],
  },
  {
    id: "vocabulary",
    name: "Vocabulary",
    weight: 0.2,
    description: "Approved simple words; no contractions; no vague fillers.",
    ruleIds: ["STE-S4", "STE-S6", "STE-S8"],
  },
  {
    id: "form_and_punctuation",
    name: "Form & punctuation",
    weight: 0.14,
    description: "No Latin abbrevs, semicolons, or procedure parentheses; short relative clauses.",
    ruleIds: ["STE-S7", "STE-S10", "STE-S11", "STE-S15"],
  },
  {
    id: "consistency_and_clarity",
    name: "Consistency",
    weight: 0.1,
    description: "One term per meaning; noun clusters ≤3.",
    ruleIds: ["STE-S5", "STE-S14"],
  },
];

export type CriterionScore = {
  id: RubricCriterionId;
  name: string;
  weight: number;
  score: number;
  max: 100;
  findings: Issue[];
  pass: boolean;
  notes: string;
};

export type RubricReport = {
  analysis: AnalysisResult;
  criteria: CriterionScore[];
  weightedScore: number;
  /** Strict adversarial pass: weighted score + hard gates */
  pass: boolean;
  hardGateFailures: string[];
  critique: string;
  priorityFindings: Issue[];
};

const SEV_WEIGHT = { error: 12, warning: 5, info: 2 } as const;

function scoreFromFindings(findings: Issue[]): number {
  if (findings.length === 0) return 100;
  let penalty = 0;
  for (const f of findings) {
    penalty += SEV_WEIGHT[f.severity];
  }
  // Multiple hits compound but floor at 0
  return Math.max(0, 100 - penalty);
}

export function scoreRubric(
  text: string,
  mode: DocMode = "auto",
  options?: { targetScore?: number; minCriterion?: number },
): RubricReport {
  const targetScore = options?.targetScore ?? 92;
  const minCriterion = options?.minCriterion ?? 80;
  const analysis = analyzeText(text, mode);

  const criteria: CriterionScore[] = RUBRIC.map((c) => {
    const findings = analysis.issues.filter((i) => c.ruleIds.includes(i.ruleId));
    const score = scoreFromFindings(findings);
    const pass = score >= minCriterion && !findings.some((f) => f.severity === "error");
    let notes = "Clean.";
    if (findings.length > 0) {
      const errs = findings.filter((f) => f.severity === "error").length;
      const warns = findings.filter((f) => f.severity === "warning").length;
      notes = `${findings.length} finding(s): ${errs} error(s), ${warns} warning(s).`;
    }
    return {
      id: c.id,
      name: c.name,
      weight: c.weight,
      score,
      max: 100 as const,
      findings,
      pass,
      notes,
    };
  });

  const weightedScore = Math.round(
    criteria.reduce((sum, c) => sum + c.score * c.weight, 0),
  );

  const hardGateFailures: string[] = [];
  if (analysis.stats.errors > 0) {
    hardGateFailures.push(`${analysis.stats.errors} residual error-class issue(s)`);
  }
  if (weightedScore < targetScore) {
    hardGateFailures.push(
      `Weighted rubric ${weightedScore} < target ${targetScore}`,
    );
  }
  for (const c of criteria) {
    if (c.score < minCriterion) {
      hardGateFailures.push(`${c.name} scored ${c.score} (min ${minCriterion})`);
    }
  }
  // Adversarial: any STE-S1 or STE-S2 error is automatic fail (already in errors, reinforced)
  const critical = analysis.issues.filter(
    (i) =>
      (i.ruleId === "STE-S1" || i.ruleId === "STE-S2" || i.ruleId === "STE-S9") &&
      i.severity === "error",
  );
  if (critical.length > 0) {
    hardGateFailures.push(
      `${critical.length} critical length/instruction/modal violation(s)`,
    );
  }

  const pass = hardGateFailures.length === 0;

  const priorityFindings = [...analysis.issues].sort((a, b) => {
    const rank = { error: 0, warning: 1, info: 2 };
    return rank[a.severity] - rank[b.severity] || a.start - b.start;
  });

  const failed = criteria.filter((c) => !c.pass);
  const critiqueParts: string[] = [];
  if (pass) {
    critiqueParts.push(
      `ADVERSARY VERDICT: PASS. Weighted score ${weightedScore}/100 meets target ${targetScore}. All hard gates clear.`,
    );
  } else {
    critiqueParts.push(
      `ADVERSARY VERDICT: FAIL. Weighted score ${weightedScore}/100 (target ${targetScore}).`,
    );
    critiqueParts.push(`Hard gates: ${hardGateFailures.join("; ")}.`);
    if (failed.length) {
      critiqueParts.push(
        `Weak dimensions: ${failed.map((f) => `${f.name}=${f.score}`).join(", ")}.`,
      );
    }
    const top = priorityFindings.slice(0, 8);
    if (top.length) {
      critiqueParts.push("Priority attacks:");
      for (const i of top) {
        critiqueParts.push(
          `- [${i.severity}] ${i.ruleId} L${i.line}: ${i.message} → ${i.suggestion}`,
        );
      }
    }
    critiqueParts.push(
      "Editor must eliminate all error-class issues and raise every criterion above the floor.",
    );
  }

  return {
    analysis,
    criteria,
    weightedScore,
    pass,
    hardGateFailures,
    critique: critiqueParts.join("\n"),
    priorityFindings,
  };
}
