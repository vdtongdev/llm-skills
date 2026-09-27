---
id: 0014
slug: switch-account-refactor
started: 2026-09-26
finalized: true
branch: master
head: 9d493b0
tasks: []
topics: [switch-account]
---

# Session 0014 - switch-account-refactor

## Log

- discovered: Claude Code rotates the refresh token on every refresh, so matching slots by refresh token failed. `refreshTokenExpiresAt` stays fixed per login (live vs slot 0 differed by 450 ms; other logins differ by hours or days). Both timestamps in each file share the same ms digits, suggesting client-side `Date.now()` math.
- decision: Match the live login to a slot by `refreshTokenExpiresAt` within 60 s. Rejected storing account email in slots (stale identity after a switch) and calling the profile API (network, overkill).
- decision: `switch` and `bak` save newer live tokens into their matched slot first, so a rotated-out refresh token is never swapped back in. Wiped live tokens are never saved. User rejected atomic writes, `.claude.json` formatting preservation, and numeric slot sorting as unneeded.
- done: `switch-account.py` - renamed all identifiers descriptively (`is_wiped`, `find_live_slot`, `save_live_to_slot`, ...), removed unused `running()`, added expiry matching and save-before-swap. Verified with `uv run python` from `/workspace` against a temp `CLAUDE_CONFIG_DIR`; the real listing now marks slot 0 as live.
- discovered: Claude Code keeps no quota on disk; only the status line command receives it (`rate_limits.five_hour` / `seven_day` with `used_percentage` and `resets_at` in epoch seconds).
- decision: `statusline.js` caches quota in `$CLAUDE_CONFIG_DIR/.usage-cache.json`, one entry per login keyed by `refresh_expires_at` with the same 60 s tolerance; `switch-account.py` shows last seen usage per slot. Rejected querying the OAuth usage API per slot (undocumented, needs network, and expired slot access tokens would need rotating refreshes). Accepted risk: concurrent sessions can tear the cache write, which only drops cached entries.
- done: `statusline.js`, `switch-account.py` - usage cache write and per-slot `5h NN% 7d NN% (seen X ago)` columns; reset windows show 0%; durations under an hour show minutes. Verified with temp-dir tests, and the real cache appeared from the live status line.
- discovered: Claude Code exports `COLUMNS` to the status line command (169 in the user's terminal) but truncates the line at 165 cells with `…`. Its stdin JSON has no width field (keys include `context_window`, `rate_limits`, `workspace`).
- done: `statusline.js` - subtracts a measured 4-column `CLAUDE_CODE_MARGIN` before right-aligning, fixing the clipped 7d countdown; corrected the `terminalWidth()` comment. Verified: `COLUMNS=169` renders 165 cells.
- done: `switch-account.py` - one header row via `ROW_FORMAT` instead of repeating labels per row.
- done: `statusline.js` - context cell shows only the bar and token count (dropped `/200k NN%`); replaced the `+added/-removed` cell with `🌿 <branch>` from `git branch --show-current` in `workspace.current_dir`, omitted when detached or outside a repo. Verified at `COLUMNS=169` in and outside a repo.
- done: `statusline.js` - branch icon is 🪾; reset countdowns show the two largest units from d to s (`2d 4h`, `3h 20m`, `20m 34s`, `10s`), rounding down like a clock.
- done: `switch-account.py` - `write <n>` over an existing slot asks `overwrite it? [y/N]`; only `y`/`yes` proceed, anything else or no input exits `cancelled` with code 1. Automatic saves in `switch`/`bak` stay unprompted (same login, newer tokens).
- discovered: Adversarial review found that 60 s tolerance plus first-match let a login made under 60 s after another overwrite its slot; the save-before-swap copied any differing live tokens, so a stale live (from `bak`) overwrote the newer slot; a wiped live matching slot N made `switch N` report "already live"; null `used_percentage`/`resets_at` crashed the listing; the first render after a switch filed the previous login's `rate_limits` under the new login.
- decision: Tolerance is 5 s in both files with closest-match; "newer" means larger `expiresAt` (each refresh extends it). Saves happen only when live is newer; `switch N` reloads the slot when live is wiped or older; `bak` restores the matching slot when it is newer than `.credentials.bak`; the status line skips a write when the login changed but `rate_limits` equal the latest entry. Skipped: warning on duplicate slots for one login, and `bak` dropping live tokens that match no slot (pre-existing).
- done: `switch-account.py`, `statusline.js` - review fixes 1-5, countdown floors instead of rounding, stale Row 1 comment fixed. Regression script in temp dirs passed for the basic flow, all five findings, and write confirmation.

## Handoff

### Work

- [x] `switch-account.py`: descriptive renames; `running()` removed; login matching by refresh expiry (5 s, closest); newer-only save before swap; wiped/stale live recovery; header row with last seen 5h/7d usage; `write` overwrite confirmation
- [x] `statusline.js`: per-login quota cache `.usage-cache.json`; 4-column Claude Code margin; context cell without limit text; 🪾 git branch cell; two-unit floor countdown; post-switch misattribution guard
- [x] `context/session_states/COMMON.md`: added `switch-account` topic
- [ ] commit: all changes above plus this session file are uncommitted; user has not asked to commit

### Next

1. Commit the changes when the user authorizes, then push and update the Codex mirror through Git.
2. If the status line clips again after a resize or Claude Code update, re-measure `CLAUDE_CODE_MARGIN` against `COLUMNS`.

### State

- tree: dirty with `statusline.js`, `switch-account.py`, `COMMON.md`, and this session file
- avoid: never read or print real `~/.claude/.credentials*.json` tokens; test with a temp `CLAUDE_CONFIG_DIR`; `python` is not on PATH here, use `uv --directory /workspace run python`
- retrieve: `REFRESH_EXPIRY_TOLERANCE_MS`, `is_newer`, `find_same_login`, `cacheUsage`, `CLAUDE_CODE_MARGIN`
