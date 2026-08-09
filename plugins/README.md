# STE100 Agent Plugins

**Local-only** [ASD-STE100](https://www.asd-ste100.org/) Simplified Technical English packs for:

| Agent | What you get |
|---|---|
| **Claude Code** | Skill + **output style** (`STE100`) |
| **Grok Build** | Skill under `.grok/skills/ste100/` |
| **Codex** | `AGENTS.md` merge + rules |

> **No API keys. No network. No external STE service.**  
> Agents enforce STE in-context via orchestrator → editor → adversary.

[Spillwave Solutions](https://github.com/SpillwaveSolutions) · MIT License

## Features

- **Orchestrator** — rounds, accept/stop, best candidate
- **Editor (doer)** — rewrites from the **original source** at aggressiveness 1→3
- **Adversary** — weighted 6-axis rubric + hard gates
- **Claude Code output style** — `/output-style STE100` for documentation sessions
- Procedure ≤20 words / description ≤25 words · active voice · approved vocabulary subset

## Quick install

### Claude Code (skill + output style)

```bash
git clone https://github.com/SpillwaveSolutions/ste100-agent-plugins.git
cd ste100-agent-plugins

# Project skill
mkdir -p .claude/skills/ste100 .claude/output-styles
cp -R skills/ste100/* /path/to/your/project/.claude/skills/ste100/
cp output-styles/ste100.md /path/to/your/project/.claude/output-styles/ste100.md
```

In Claude Code:

```text
/output-style STE100
```

Or copy into user-level styles: `~/.claude/output-styles/ste100.md`.

### Grok Build

```bash
mkdir -p /path/to/workspace/.grok/skills/ste100
cp -R plugins/grok-build/* /path/to/workspace/.grok/skills/ste100/
```

### Codex

```bash
cat plugins/codex/AGENTS.ste100.md >> /path/to/project/AGENTS.md
# keep plugins/codex/rules.md + loop.md nearby or paste rules into AGENTS.md
```

## Repository layout

```text
.claude/output-styles/ste100.md   # Claude Code output style (project)
output-styles/ste100.md           # same file for install
skills/ste100/                    # Claude / shared skill
plugins/claude-code/              # Claude pack (+ output-style.md)
plugins/grok-build/               # Grok Build pack
plugins/codex/                    # Codex AGENTS + rules
AGENTS.md                         # Codex-ready entry
CLAUDE.md                         # Claude project notes
```

## Compliance loop (all agents)

```text
adversary(original)
for level in 1..3:
  candidate = editor(original, level)   # always from original
  adversary(candidate)
  keep best
stop on pass or max rounds
```

**Hard gates:** any error · score < 92 · axis < 80 · critical STE-S1/S2/S9

See `skills/ste100/loop.md` and `skills/ste100/rules.md`.

## Disclaimer

The full official ASD-STE100 dictionary is proprietary and licensed by ASD.  
This pack implements publicly documented writing-rule practice plus a practical word list — not a certified full-dictionary authority.

## License

MIT © Spillwave Solutions
