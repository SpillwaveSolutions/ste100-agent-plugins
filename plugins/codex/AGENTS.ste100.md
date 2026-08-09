# STE100 local plugin for Codex (no API calls)

Merge this section into project `AGENTS.md`. Companion files: `rules.md`, `loop.md`.

## Scope

Technical procedures, runbooks, operator manuals, maintenance steps, and any
request for STE / Simplified Technical English / ASD-STE100.

## Hard rule: zero API calls

This plugin is **pure agent instructions**. Do **not**:

- Call OpenAI / other HTTP APIs for STE checking  
- Install network linters or fetch remote dictionaries  
- Require API keys  

All work is in-context using `rules.md` + `loop.md`.

## Multi-agent loop (simulate three roles)

| Role | Job |
|---|---|
| **Orchestrator** | Rounds, accept/stop, best candidate |
| **Editor (doer)** | Rewrite **original source** at aggressiveness 1→2→3 |
| **Adversary** | Rubric score + hard gates + priority findings |

### Algorithm

```
original = source
report = adversary(original)
if report.pass: return original

best, bestReport = original, report
for round in 1..3:
  candidate = editor(original, level=round)
  report = adversary(candidate)
  if better(report, bestReport): best, bestReport = candidate, report
  if report.pass: return candidate

return best + residual report
```

Editor always rewrites from `original` (never from the previous candidate).

### Adversary hard gates

FAIL if: residual errors · weighted score < 92 · any axis < 80 · critical
STE-S1 / STE-S2 / STE-S9 errors.

### Rubric weights

Length 20% · One instruction 18% · Voice & verbs 18% · Vocabulary 20% ·
Form 14% · Consistency 10%.

### Editor levels

1. Vocabulary / contractions / Latin abbrevs  
2. Structure / passive→imperative / split compounds  
3. Full STE rebuild (goal + numbered steps + notes)

## Writing hard limits

- Procedures ≤ 20 words/sentence; descriptions ≤ 25  
- One instruction per step  
- Active voice; no contractions; no e.g./i.e./etc.  
- No should/could/might/may in steps  
- Max 3-noun clusters; one term per meaning  

## Preferred substitutions

utilize→use · commence→start · terminate→stop · facilitate→help · in order to→to ·
prior to→before · perform→do · obtain→get · indicate→show · set up→install ·
take off→remove · e.g.→for example · make sure/ensure→check

## Report shape

```
## STE orchestrator report
status / baseline→final / rounds / API calls: none
## Adversary residuals
- rule · quote · fix
## Final STE text
…
```
