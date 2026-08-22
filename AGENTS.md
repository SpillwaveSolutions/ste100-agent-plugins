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
# STE compliance loop (local, no API)

Run this protocol entirely inside the agent context. **Do not call any API.**

## Rubric axes

| Axis | Weight | Floor |
|---|---:|---:|
| Sentence length | 20% | 80 |
| One instruction | 18% | 80 |
| Voice & verbs | 18% | 80 |
| Vocabulary | 20% | 80 |
| Form & punctuation | 14% | 80 |
| Consistency | 10% | 80 |

Target weighted score: **92**.

## Adversary audit checklist

For each sentence / step, check STE-S1…STE-S15 in `rules.md`.  
Severity: **error** (blocks pass) · **warning** · **info**.

Hard FAIL if:

1. Any error remains  
2. Weighted score < 92  
3. Any axis < 80  
4. Any STE-S1 / STE-S2 / STE-S9 error  

## Editor rewrite from original only

| Level | Actions |
|---:|---|
| 1 | Approved words; expand contractions; replace e.g./i.e./etc. |
| 2 | One idea per sentence; split "and" commands; active voice; strip should/could/might/may |
| 3 | Rebuild: goal line + numbered imperative steps + optional Notes |

## Orchestrator decisions

- `accept` — adversary pass  
- `continue` — escalate editor level on **original**  
- `max_rounds` — return best candidate + residual list  

Keep **best** by: fewer errors first, then higher weighted score.

## Self-check before finish

- [ ] Zero API / network tool use for this task  
- [ ] Procedure steps ≤ 20 words each  
- [ ] Description sentences ≤ 25 words  
- [ ] One instruction per step  
- [ ] No contractions, Latin abbrevs, weak modals in steps  
- [ ] Consistent terminology  


## Full rules

See `skills/ste100/rules.md` and `plugins/codex/rules.md`.

<!-- worklog:policy:start -->
## WikiTicket SDD (worklog)

This plugin tracks implementation with [WikiTicket SDD](https://github.com/SpillwaveSolutions/wiki_ticket_sdd).

- Install the `worklog` plugin from `SpillwaveSolutions/wiki_ticket_sdd` (Claude Code, Grok Build, Codex, Cursor).
- Config lives in `.work/config.yml`. Event log is `.work/todo.jsonl`.
- Every plan MUST end by running `worklog plan-capture`.
- Work discovered mid-flight: `worklog add --unplanned --discovered-during <item>` BEFORE doing the work.
- Never hand-edit `.work/*.jsonl` (use `worklog`) or `docs/roadmap.md` (generated).
- After changing work items, run `worklog roadmap-render` and commit the log and roadmap together.
- CLI: `worklog` on PATH, or `python3 <wiki_ticket_sdd>/bin/worklog`.
<!-- worklog:policy:end -->

