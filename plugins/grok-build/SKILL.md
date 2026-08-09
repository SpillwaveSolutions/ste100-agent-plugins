---
name: ste100
description: >
  Local-only ASD-STE100 Simplified Technical English gate for Grok Build.
  No API keys, no network, no external services. Pure skill instructions:
  orchestrator + editor + adversarial rubric loop. Triggers on docs, procedures,
  runbooks, STE, simplified English, ASD-STE100, maintenance steps.
metadata:
  short-description: "Local STE100 plugin — no API calls"
---

# STE100 (Grok Build) — local plugin, zero API calls

This skill is **instruction-only**. Do **not** call the xAI API, HTTP endpoints,
or any network STE checker while enforcing these rules. Compliance is performed
in-context using `rules.md` + `loop.md`.

## Non-negotiable

- **No API calls**
- **No secrets / env keys required**
- Edit only workspace documentation text
- Simulate orchestrator → editor → adversary locally

## Roles

1. **Orchestrator** — rounds, accept/stop, best candidate  
2. **Editor (doer)** — rewrite **from original source** at level 1→3  
3. **Adversary** — rubric + hard gates  

## Loop

```
baseline adversary(original)
while not pass and round <= 3:
  candidate = editor(original, level=round)
  report = adversary(candidate)
  keep best
return best
```

Never chain editor→editor on a prior draft. Escalate by re-rewriting the source.

## Rubric floors

Target score **92**. Axis floor **80**. Any error = FAIL.

Axes: length 20% · one instruction 18% · voice/verbs 18% · vocabulary 20% ·
form 14% · consistency 10%.

## Editor levels

| L | Work |
|---|---|
| 1 | Vocabulary / full forms |
| 2 | Structure + imperative |
| 3 | Full STE rebuild |

## Rules

See `rules.md` and `loop.md`.

## Grok Build UI note

When building STE tooling UIs, prefer **local deterministic** demos. Do not wire
visitor-facing LLM API calls for this skill.
