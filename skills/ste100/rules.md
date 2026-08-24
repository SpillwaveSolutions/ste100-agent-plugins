# ASD-STE100 writing rules (local agent pack)

Use for technical documentation, procedures, maintenance steps, and operator guides.

**Local only. No API calls.** Full official dictionary is ASD-proprietary. This pack uses public writing-rule practice plus a practical word list.

## Core constraints

| ID | Rule | Limit / action |
|---|---|---|
| STE-S1 | Sentence length | Procedures ≤ **20** words; descriptions ≤ **25** |
| STE-S2 | One instruction | One command or thought per sentence / step |
| STE-S3 | Active voice | Prefer *Do X* over *X is done* |
| STE-S4 | Vocabulary | Prefer approved simple words |
| STE-S5 | Noun clusters | Max **3** nouns in a row |
| STE-S6 | No contractions | `do not`, not `don't` |
| STE-S7 | No Latin abbrevs | Write `for example`, not `e.g.` |
| STE-S8 | No vague fillers | Avoid *very, quite, maybe, generally* |
| STE-S9 | Strong procedure verbs | No *should/could/might/may* in steps |
| STE-S10 | No procedure parentheses | New sentence or table instead |
| STE-S11 | No semicolons | Two sentences |
| STE-S12 | Simple connectors | Do not pack two commands with *and/but/or* |
| STE-S13 | Single-word verbs | *remove* not *take off*; *install* not *set up* |
| STE-S14 | Consistency | One meaning, one word |
| STE-S15 | Short relatives | Avoid long *which/that* packing |
| STE-S16 | No em dash | Do not use `—` or `--` as punctuation. Use a period or a comma. |
| STE-S17 | No weak openers | Do not start a sentence with **So**, **That**, **Thus**, or **Hence**. |

STE-S16 and STE-S17 are hard errors. They apply to every document this pack reviews.

## Preferred substitutions

| Avoid | Prefer |
|---|---|
| utilize / utilised | use / used |
| commence / initiate | start |
| terminate | stop |
| facilitate | help |
| in order to | to |
| prior to | before |
| subsequent to | after |
| carry out / perform | do |
| obtain | get |
| indicate / demonstrate | show |
| e.g. / i.e. / etc. | for example / that is / and more |
| set up | install |
| shut down | stop |
| look at | examine |
| take off / take out | remove |
| make sure / ensure | check |

## Procedure template

```text
Do this procedure to [goal].

1. [Imperative verb] [object].
2. [Imperative verb] [object].
3. If [condition], [imperative].

Notes:
[Short descriptive sentences.]
```

## Mutual exclusivity

`ste100` and `google-docs-style` are alternate voice packs. Use one pack per document. Default for document-specialist and WikiTicket design docs is STE100. Switch only when the user names Google style.
