---
name: ste100
description: >
  Local-only ASD-STE100 Simplified Technical English gate for Claude Code.
  No API keys, no network, no external services. Runs as pure agent instructions:
  orchestrator + editor (doer) + adversarial rubric loop on documentation text.
  Use when writing or reviewing procedures, runbooks, manuals, operator guides,
  maintenance steps, or when the user mentions STE / ASD-STE100 / simplified English.
metadata:
  short-description: "Local STE100 plugin — no API calls"
---

# STE100 (Claude Code) — local plugin, zero API calls

This skill is **instruction-only**. Do not call APIs, tools that hit the network,
webhooks, or external STE services. All compliance work is done **in-context**
by you (the agent) using the rules in this folder.

## Non-negotiable

- **No API calls** (no OpenAI, Anthropic extra endpoints, xAI, HTTP STE checkers)
- **No install scripts** that phone home
- Work only on the user's document text in the workspace
- Read `rules.md` and `loop.md` in this skill directory

## Roles you simulate (single agent, three hats)

| Role | What you do |
|---|---|
| **Orchestrator** | Plan rounds, stop/accept, keep the best candidate |
| **Editor (doer)** | Rewrite the **original source** at aggressiveness 1 → 2 → 3 |
| **Adversary** | Score the rubric, hard-gate errors, list priority attacks |

## Loop (must run for docs)

```
original = source document
report = adversary_audit(original)     # use rules.md STE-S1…S15
if report.pass → return original

best, bestReport = original, report
for round in 1..3:
  candidate = editor_rewrite(original, level=round, critique=bestReport)
  report = adversary_audit(candidate)
  if better(report, bestReport): best, bestReport = candidate, report
  if report.pass → return candidate

return best + residual adversary report
```

**Critical:** always rewrite from `original`, never re-edit a degraded draft.

## Editor levels

1. Vocabulary + full forms (no contractions, no Latin abbrevs)  
2. Structure: expand parentheses; split compounds; active/imperative  
3. Full STE rebuild: goal sentence + numbered steps + short notes  

## Adversary hard gates (FAIL if any)

- Any error-class issue  
- Weighted score < 92  
- Any rubric axis < 80  
- Critical STE-S1 / STE-S2 / STE-S9  

## Output format

```markdown
## STE orchestrator report
- Status: passed | partial | failed
- Baseline → final (score)
- Rounds: N
- API calls: none
## Adversary residuals
- STE-Sx · quote · fix
## Final STE text
…
```

## Rules

See `rules.md` and `loop.md`.
