# STE100 reference engine (TypeScript)

Portable TypeScript implementation of the **orchestrator → editor → adversary** loop described in `skills/ste100/loop.md`.

No network calls. No ASD license key. Runs anywhere TypeScript/JavaScript runs.

## Modules

| File | Role |
|---|---|
| `orchestrator.ts` | Compliance loop: baseline score → progressive rewrites from **original** → accept/stop |
| `editor.ts` | Doer: aggressiveness levels 1–3 (vocab → structure → full STE procedure rebuild) |
| `rubric.ts` | Adversary: weighted 6-axis rubric + hard gates |
| `analyzer.ts` | Rule checks (STE-S1…S15): length, voice, clusters, vocabulary, punctuation |
| `dictionary.ts` | Practical approved/substitution word lists (not the full proprietary ASD dictionary) |
| `rules.ts` | Rule catalog |
| `types.ts` | Shared types |

## Usage

```ts
import { runComplianceLoop } from "./orchestrator";

const result = runComplianceLoop(messyProcedureText, {
  mode: "procedure",
  maxRounds: 4,
  targetScore: 92,
  minCriterion: 80,
});

console.log(result.status, result.finalReport.score);
console.log(result.finalText);
```

Copy `engine/` into your repo, or import the files directly. Dependencies: none (pure TypeScript).

## Agent plugins vs this engine

| | Agent plugins (`skills/`, `plugins/`) | This engine |
|---|---|---|
| Where it runs | Inside Claude Code / Grok Build / Codex context | Your app or CLI |
| Enforcement | LLM follows skill + loop.md | Deterministic rewrite + score |
| Vocabulary | Model uses rules.md | `dictionary.ts` subset |

Use **both**: plugins for authoring sessions; this engine for CI, gates, or product UIs.
