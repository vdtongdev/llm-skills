---
id: 0015
slug: switch-account-listing
started: 2026-09-26
finalized: true
branch: master
head: 9d493b0
tasks: []
topics: [switch-account]
---

# Session 0015 - switch-account-listing

Continues finalized session 0014.

## Log

- done: `switch-account.py` - 5h/7d cells show time until reset in brackets, two largest units without a space (`5% (4h39m)`, `1% (6d23h)`), floored via `format_time_left`; reset windows show `0%` with no bracket, missing `resets_at` shows the percentage alone. Percentages and `-` placeholders right-align in 12-wide columns. Verified with a temp `CLAUDE_CONFIG_DIR` and the real listing.
- done: `switch-account.py` - access/refresh timestamps use `MM-DD HH:MM` instead of ISO dates; columns narrowed from 28 to 22, which fits the longest value `12-31 23:59 (365d ago)`.

## Handoff

### Work

- [x] `switch-account.py`: reset countdown in usage cells; `MM-DD` timestamps
- [ ] commit: sessions 0014 and 0015 changes (`statusline.js`, `switch-account.py`, `COMMON.md`, both session files) are uncommitted; user has not asked to commit

### Next

1. Commit when the user authorizes, then push and update the Codex mirror through Git.

### State

- tree: dirty with `statusline.js`, `switch-account.py`, `COMMON.md`, and session files 0014 and 0015
- avoid: never read or print real `~/.claude/.credentials*.json` tokens; test with a temp `CLAUDE_CONFIG_DIR`; importing `switch-account.py` from Python writes `__pycache__/` in the repo, so delete it after
