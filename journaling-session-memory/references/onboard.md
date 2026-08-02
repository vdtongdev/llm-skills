# Onboard - Resume Work

Load the smallest state that supports a safe continuation.

## 1. Locate and Upgrade Storage

Resolve `<state-dir>` once. Default: `context/session_states/`. Honor a plural `session states:` directory override in project instructions and use `<state-dir>` in every later command.

For migration only, also honor a legacy singular `session state:` file override. If `<state-dir>` is missing but that file or `context/SESSION_STATE.md` exists:

1. Create the folder.
2. Move the legacy file verbatim to `0000-legacy.md` with `git mv` when tracked.
3. Create COMMON from `common-format.md`.
4. Add one active topic pointing to `0000` for unclassified legacy state.

If neither exists, report that no session state exists, collect current Git state, and continue to Step 7. Step 8 creates storage after work is confirmed.

If `<state-dir>` contains session files but no COMMON, report incomplete state and ask before reconstructing the active view.

### Existing COMMON format upgrade

When COMMON lacks `budget_words` frontmatter or uses legacy headings:

1. Read `common-format.md`.
2. Add or merge frontmatter containing `budget_words: {target: 4000, hard: 6000}`.
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

1. Match current subsystem against active COMMON Topics.
2. Read named sessions' Handoffs.
3. Search archive by task id, changed path, or retrieval hint when needed.
4. Read a full historical Log only after its Handoff confirms relevance.

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
- existing matching topic names
- empty Log
- no Handoff until offboard

Record reconstruction notes now.

## 9. Reconcile Recovery Evidence

When Steps 3-5 found new or reconstructed evidence, derive its touched paths, dependencies, issue/task ids, workarounds, and `RECHECK` events. Apply checkpoint's COMMON classification now, even when COMMON is below target. Record every C/D/Q change in the new session Log.

Skip only when recovery produced no new project evidence.

## 10. Enforce COMMON Budget

Count first:

```bash
wc -w context/session_states/COMMON.md
```

Use the resolved COMMON path instead when the project overrides `<state-dir>`.

- Below declared target: skip pruning.
- At or above target but below hard ceiling: prune before implementation.
- At or above hard ceiling: prune below hard before normal work; aim below target.

Read `common-format.md` only when pruning or reconciling pending Log entries.

Prune with evidence, in order:

1. Delete answered Q entries and closed/done Topics.
2. Delete Redirects with no live inbound reference outside the journal archive.
3. Delete C/D entries already represented in authoritative documents verified to load for every supported host.
4. Revalidate conditional entries whose `RECHECK` event may have occurred; KEEP / REPLACE / RETIRE / PROMOTE.
5. Merge duplicate current entries without changing anchor meaning. Before deleting an anchor, update live non-archive references or keep a Redirect.
6. Remove stale session ids from Topics; keep only useful retrieval routes.

Age alone never proves obsolescence. Do not delete an unresolved question or current directive without replacement evidence. Append every C/D/Q retirement, replacement, or promotion to the new session Log in the same edit cycle. Routine Topic and Redirect cleanup needs no Log entry.

After COMMON is below the hard ceiling, reconcile any `pending-common` Log entries named by the previous Handoff before normal work. Allocate pending Q anchors now and replace temporary Handoff question text in the new session's eventual Handoff.
