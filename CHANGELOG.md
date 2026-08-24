# Changelog

## 0.1.4 — 2026-08-24

- STE-S16 (no em dash) and STE-S17 (do not start a sentence with So, That, Thus, or Hence) as hard gates. The v0.1.4 tag already carried the rules; host manifests still said 0.1.3.
- Version lockstep repaired. `.claude-plugin/plugin.json`, `plugin.json`, `.codex-plugin/plugin.json`, and `.cursor-plugin/plugin.json` now read 0.1.4.

## 0.1.3

- WikiTicket SDD (worklog) is the tracking system for this plugin.


## 0.1.2

- Three-host hooks: Codex + Cursor-native when Claude hooks exist.


## 0.1.1 — 2026-08-09

- Add pure TypeScript reference engine (`engine/`): orchestrator, editor, adversary rubric, analyzer, dictionary
- Barrel export `engine/index.ts` and engine README
- Document engine install path in root README

## 0.1.0 — 2026-08-09

- Initial release: local STE100 plugins for Claude Code, Grok Build, and Codex
- Claude Code **output style** (`STE100`) for ASD-STE100 documentation voice
- Orchestrator / editor / adversary compliance loop (no API calls)
- Shared rules (STE-S1…S15) and substitutions
