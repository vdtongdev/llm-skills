# Onboard - Resume Work

Load the smallest state that supports a safe continuation.

## Contents

- [Locate and upgrade storage](#1-locate-and-upgrade-storage)
- [Read and compare fixed state](#2-read-fixed-state)
- [Recover and load task context](#4-recover-an-unclean-session)
- [Confirm work and create the session](#7-confirm-work)
- [Reconcile evidence and enforce the budget](#9-reconcile-recovery-evidence)

## 1. Locate and Upgrade Storage

Resolve `<state-dir>` once. Default: `context/session_states/`. Honor a plural `session states:` directory override in project instructions and use `<state-dir>` in every later command.

For migration only, also honor a legacy singular `session state:` file override. If `<state-dir>` is missing but that file or `context/SESSION_STATE.md` exists:

1. Create the folder.
2. Move the legacy file verbatim to `0000-legacy.md` with `git mv` when tracked.
3. Create COMMON from `common-format.md`.
4. Add one `legacy` Topic describing unclassified migrated state. Retrieve its evidence directly from `0000-legacy.md`.

If neither exists, report that no session state exists, collect current Git state, and continue to Step 7. Step 8 creates storage after work is confirmed.

If `<state-dir>` contains session files but no COMMON, report incomplete state and ask before reconstructing the active view.

### Existing COMMON format upgrade

When COMMON lacks `budget_words` frontmatter or uses legacy headings:

1. Read `common-format.md`.
2. Add or merge frontmatter containing `budget_words: ...`.
3. Rename legacy headings mechanically:
   - `Constraints & Conventions` -> `Constraints`
   - `Active Decisions` -> `Decisions`
   - `Open Questions` -> `Questions`
   - `Tombstones` -> `Redirects`
   - `Topic Index` -> `Topics`

Do not combine format migration with semantic pruning. Preserve existing entries until Step 10 evaluates them.

## 2. Read Fixed State

Read in order:

1. COMMON, whole file.
2. Latest session file, Handoff first.

Accept legacy `## Handoff Capsule` in old sessions. Read the Log/body only when Handoff is missing, explicitly points there, or recovery requires it.

## 3. Compare Minimal Git State

Run:

```bash
git branch --show-current
git rev-parse --short HEAD
git status --short
```

Compare branch, HEAD, and tree state with latest session frontmatter/Handoff.

- Branch mismatch: report before editing.
- Dirty tree not described by Handoff: report before editing.
- Query stashes only when Handoff names one or recovery evidence suggests one.
- Query commit history only when recorded HEAD differs from current HEAD.

## 4. Recover an Unclean Session

Suspect, do not assume, an unclean end when:

- latest file has `finalized: false`;
- current HEAD differs from recorded `head` without explanation;
- tracker state conflicts with Handoff.

Recover cheapest first:

1. Latest session Log, or legacy Milestones/Corrections sections.
2. Targeted `git diff <recorded-head>..HEAD` or working-tree diff.
3. Relevant task notes.

If evidence cannot reconstruct the state, report the gap and ask. Never inspect provider transcripts. Leave the old file unchanged; record reconstruction in the new session Log.

## 5. Load Tracker State

Skip without `.tasks/`.

1. Read each task in latest session `tasks:`.
2. Run `task list --ready`.
3. Trust tracker for task status; trust session file for narrative evidence.

## 6. Retrieve Archive Selectively

Only with active work:

1. Match current subsystem against COMMON Topic codes and descriptions.
2. Grep matching topic codes across session frontmatter; validate `topics:` matches.
3. Read matching sessions' Handoffs newest first.
4. Search archive by anchor, task id, changed path, symbol, issue id, or retrieval hint when needed.
5. Read targeted historical Log passages only after a Handoff or search hit confirms relevance.

Topics are hints, not gates. A strong archive match remains valid after its topic was pruned.

## 7. Confirm Work

Summarize recovered status and immediate next action. Ask only when the current user message did not already confirm the work or when Steps 3-4 found an unexplained conflict.

Before implementation, load every required doc and skill from task context or Handoff.

## 8. Create the New Session File

Read `session-format.md`. Create the next numbered file immediately before implementation:

- If `<state-dir>` does not exist, create it and create COMMON from `common-format.md` first.

- `finalized: false`
- current branch
- active task ids
- existing matching topic codes
- empty Log
- no Handoff until offboard

Record reconstruction notes now.

## 9. Reconcile Recovery Evidence

When Steps 3-5 found new or reconstructed evidence, derive its touched paths, dependencies, issue/task ids, workarounds, and `RECHECK` events. Apply checkpoint's COMMON classification now, even when COMMON is below target. Record every semantic C/D/Q change in the new session Log; wording-only `CONDENSE` edits need no entry.

Skip only when recovery produced no new project evidence.

## 10. Enforce COMMON Budget

Count first:

```bash
wc -w context/session_states/COMMON.md
```

Use the resolved COMMON path instead when the project overrides `<state-dir>`.

- Below declared target: skip pruning unless Topics still list session ids; when they do, read `compact-common.md` and migrate only those routes.
- At or above target but below hard ceiling: read `compact-common.md` and compact before implementation.
- At or above hard ceiling: read `compact-common.md`; compact below hard before normal work and aim below target.

Follow `compact-common.md`; it owns archive investigation, lossy retention, dense rewriting, Redirect audits, and Topic rebuilding. Age alone never proves low value. Do not delete an unresolved question or behavior-changing directive without evidence supporting its disposition.

After COMMON is below the hard ceiling, reconcile any `pending-common` Log entries named by the previous Handoff before normal work. Allocate pending Q anchors now and replace temporary Handoff question text in the new session's eventual Handoff.
