# WikiTicket SDD

This repository uses **WikiTicket SDD** (`worklog`) for visible WIP.

Plugin: https://github.com/SpillwaveSolutions/wiki_ticket_sdd  
Release: v0.24.4

## Install

Claude Code / Grok Build:

```
/plugin marketplace add SpillwaveSolutions/wiki_ticket_sdd
/plugin install worklog
```

Codex: `codex plugin marketplace add SpillwaveSolutions/wiki_ticket_sdd`

Cursor: install via Agent Plugins / `.cursor-plugin` from that repo.

## CLI

```
python3 path/to/wiki_ticket_sdd/bin/worklog add --level story --kind feature "title"
python3 path/to/wiki_ticket_sdd/bin/worklog list
python3 path/to/wiki_ticket_sdd/bin/worklog roadmap-render
```

Do not hand-edit `.work/*.jsonl`.
