import { scoreRubric, type RubricReport } from "./rubric";
import { editTowardSte, type EditorAggressiveness, type EditorResult } from "./editor";
import type { DocMode } from "./types";

export type AgentRole = "orchestrator" | "editor" | "adversary";

export type TimelineEvent = {
  id: string;
  at: number;
  role: AgentRole;
  title: string;
  detail: string;
};

export type LoopRound = {
  round: number;
  inputText: string;
  editor: EditorResult;
  adversary: RubricReport;
  decision: "continue" | "accept" | "max_rounds";
  decisionReason: string;
};

export type OrchestratorConfig = {
  mode: DocMode;
  maxRounds: number;
  targetScore: number;
  minCriterion: number;
};

export type OrchestratorResult = {
  config: OrchestratorConfig;
  initial: RubricReport;
  rounds: LoopRound[];
  finalText: string;
  finalReport: RubricReport;
  status: "passed" | "partial" | "failed";
  timeline: TimelineEvent[];
  summary: string;
};

const DEFAULT_CONFIG: OrchestratorConfig = {
  mode: "auto",
  maxRounds: 3,
  targetScore: 92,
  minCriterion: 80,
};

function aggressivenessForRound(round: number): EditorAggressiveness {
  if (round <= 1) return 1;
  if (round === 2) return 2;
  return 3;
}

/**
 * Orchestrator — runs Editor ⇄ Adversary until STE rubric pass or max rounds.
 *
 * Important: the editor always rewrites from the **original source** at the
 * current aggressiveness level (not from the previous mangled draft). The
 * adversary critique is still passed so level-3 rebuild can prioritize findings.
 * Between rounds we keep the **best-scoring** candidate.
 */
export function runComplianceLoop(
  sourceText: string,
  partialConfig?: Partial<OrchestratorConfig>,
): OrchestratorResult {
  const config: OrchestratorConfig = { ...DEFAULT_CONFIG, ...partialConfig };
  const timeline: TimelineEvent[] = [];
  let t = 0;
  const push = (role: AgentRole, title: string, detail: string) => {
    timeline.push({
      id: `ev-${timeline.length + 1}`,
      at: t++,
      role,
      title,
      detail,
    });
  };

  const original = sourceText;

  push(
    "orchestrator",
    "Start compliance loop",
    `Target score ${config.targetScore}, min criterion ${config.minCriterion}, max ${config.maxRounds} rounds. Editor always rewrites from source.`,
  );

  const initial = scoreRubric(original, config.mode, {
    targetScore: config.targetScore,
    minCriterion: config.minCriterion,
  });
  push(
    "adversary",
    "Baseline audit",
    `Score ${initial.weightedScore}/100 — ${initial.pass ? "PASS" : "FAIL"}. ${initial.hardGateFailures[0] ?? "Gates clear."}`,
  );

  if (initial.pass) {
    push("orchestrator", "Accept baseline", "Document already meets the STE rubric.");
    return {
      config,
      initial,
      rounds: [],
      finalText: original,
      finalReport: initial,
      status: "passed",
      timeline,
      summary: "Already compliant — no editor rounds required.",
    };
  }

  push(
    "orchestrator",
    "Dispatch editor",
    `Adversary failed ${initial.hardGateFailures.length} hard gate(s). Starting doer/editor loop.`,
  );

  const rounds: LoopRound[] = [];
  let bestText = original;
  let bestReport = initial;
  let lastReport = initial;

  for (let round = 1; round <= config.maxRounds; round++) {
    const level = aggressivenessForRound(round);
    push(
      "orchestrator",
      `Round ${round}: plan`,
      `Editor aggressiveness ${level}/3 from original source. Prior findings: ${lastReport.priorityFindings.length}.`,
    );

    // Always edit from original + latest adversary critique (not from degraded draft)
    const editor = editTowardSte(original, config.mode, level, lastReport);
    push(
      "editor",
      `Round ${round}: rewrite`,
      editor.actions.join(" · ") || "No changes",
    );

    const adversary = scoreRubric(editor.text, config.mode, {
      targetScore: config.targetScore,
      minCriterion: config.minCriterion,
    });
    push(
      "adversary",
      `Round ${round}: critique`,
      `Score ${adversary.weightedScore}/100 — ${adversary.pass ? "PASS" : "FAIL"}. Errors: ${adversary.analysis.stats.errors}, warnings: ${adversary.analysis.stats.warnings}.`,
    );

    // Track best candidate (prefer fewer errors, then higher score)
    const better =
      adversary.analysis.stats.errors < bestReport.analysis.stats.errors ||
      (adversary.analysis.stats.errors === bestReport.analysis.stats.errors &&
        adversary.weightedScore > bestReport.weightedScore);
    if (better) {
      bestText = editor.text;
      bestReport = adversary;
      push(
        "orchestrator",
        `Round ${round}: new best`,
        `Kept candidate with score ${adversary.weightedScore}, errors ${adversary.analysis.stats.errors}.`,
      );
    }

    let decision: LoopRound["decision"] = "continue";
    let decisionReason = "";

    if (adversary.pass) {
      decision = "accept";
      decisionReason = "Adversary rubric pass — orchestrator accepts.";
      bestText = editor.text;
      bestReport = adversary;
    } else if (round >= config.maxRounds) {
      decision = "max_rounds";
      decisionReason = `Max rounds (${config.maxRounds}) reached. Returning best candidate (score ${bestReport.weightedScore}).`;
    } else {
      decision = "continue";
      decisionReason = `Residual gates: ${adversary.hardGateFailures.slice(0, 2).join("; ") || "escalate aggressiveness"}`;
    }

    push("orchestrator", `Round ${round}: decision`, decisionReason);

    rounds.push({
      round,
      inputText: original,
      editor,
      adversary,
      decision,
      decisionReason,
    });

    lastReport = adversary;
    if (decision === "accept" || decision === "max_rounds") break;
  }

  const status: OrchestratorResult["status"] = bestReport.pass
    ? "passed"
    : bestReport.weightedScore >= config.targetScore - 10 &&
        bestReport.analysis.stats.errors === 0
      ? "partial"
      : "failed";

  const summary = bestReport.pass
    ? `Compliance achieved in ${rounds.length} round(s). Final score ${bestReport.weightedScore}/100.`
    : status === "partial"
      ? `Partial compliance after ${rounds.length} round(s). Score ${bestReport.weightedScore}/100 — review residual warnings.`
      : `Did not fully pass after ${rounds.length} round(s). Best score ${bestReport.weightedScore}/100.`;

  push("orchestrator", "Loop complete", summary);

  return {
    config,
    initial,
    rounds,
    finalText: bestText,
    finalReport: bestReport,
    status,
    timeline,
    summary,
  };
}
