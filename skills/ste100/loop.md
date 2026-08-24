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

For each sentence / step, check STE-S1…STE-S17 in `rules.md`.
Severity: **error** (blocks pass) · **warning** · **info**.

Hard FAIL if:

1. Any error remains
2. Weighted score < 92
3. Any axis < 80
4. Any STE-S1 / STE-S2 / STE-S9 / STE-S16 / STE-S17 error

## Editor rewrite from original only

| Level | Actions |
|---:|---|
| 1 | Approved words; expand contractions; replace e.g./i.e./etc.; remove em dashes; rewrite So/That/Thus/Hence openers |
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
- [ ] No em dash
- [ ] No sentence starts with So, That, Thus, or Hence
- [ ] Consistent terminology
