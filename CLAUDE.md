# STE100 agent plugins

Local-only ASD-STE100 Simplified Technical English packs for Claude Code, Grok Build, and Codex.

## Claude Code

- Skill: `skills/ste100/` (also `.claude/skills/ste100/`)
- **Output style**: `.claude/output-styles/ste100.md` — enable with `/output-style STE100`
- Rules: `skills/ste100/rules.md`
- Loop: `skills/ste100/loop.md`

## Hard rules

- **No API calls** for STE checking
- Orchestrator → editor → adversary loop from **original source** only
- Max 3 editor rounds; target weighted score 92

## Install

```bash
# Skill
mkdir -p .claude/skills/ste100
cp -R skills/ste100/* .claude/skills/ste100/

# Output style
mkdir -p .claude/output-styles
cp output-styles/ste100.md .claude/output-styles/ste100.md
# Then in Claude Code: /output-style STE100
```

See README.md for Grok Build and Codex install paths.
