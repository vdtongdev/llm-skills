# Checkpoint - Record Completed Work

Checkpoint only after a defined goal or task finishes. Batch its meaningful events into one checkpoint. Session end uses `offboard.md`.

## Triggers

- Completed current user-authorized goal
- Completed top-level tracker task
- Completed explicit untracked assignment established before work started

No other event triggers a checkpoint. Agent-created steps, subtasks, and file groups never qualify. Do not checkpoint decisions, discoveries, failures, switches, or risky work separately.

## 1. Append Session Log

Append 1-5 typed entries to the current session Log. Read `session-format.md` only when creating the file or resolving format ambiguity.

```markdown
- decision: <ruling and rationale>
- discovered: <fact and consequence>
- abandoned: <approach> - <failure> (root cause: <cause>)
- done: `<path>` - <result>
- correction: <old claim> wrong; <correct fact>
```

Never reorder or rewrite earlier Log entries.

## 2. Preserve Task Ownership

Do not mutate tracker state through this checkpoint. managing-tasks writes task notes and status changes when they occur. Read tracker state here only when the checkpoint needs it. Do not copy task status into COMMON.

## 3. Reconcile COMMON

Derive touch keys from the completed goal or task:

- changed paths and symbols;
- package, tool, service, or command names;
- issue and task ids;
- workaround, migration, or configuration names;
- explicit `RECHECK` event.

Search COMMON for those keys, then include any C/D/Q whose subject is affected without a literal match. Do not audit unrelated entries. Read `common-format.md` before changing COMMON or when classification is unclear. For every affected entry, choose:

- `KEEP`: still binds; no write.
- `CONDENSE`: same meaning with less text; rewrite the existing anchor and add no Log entry.
- `REPLACE`: allocate a new anchor, append replacement evidence to Log, remove old entry, add Redirect only for a live inbound reference.
- `RETIRE`: append why the entry no longer deserves active recall, then delete it. Valid reasons include invalid, completed, local, self-evident, no longer cross-cutting, or unlikely to change future action.
- `PROMOTE`: update a permanent document loaded for every supported host, append promotion to Log, then delete entry. If loading is ambiguous, KEEP.

Never leave an affected entry unclassified.

Fresh evidence from the completed work is sufficient for invalidation or completion. Before retiring a still-true entry as local, self-evident, no longer cross-cutting, or unlikely to affect future action, read `compact-common.md` § Investigate Before Classifying and perform its targeted retrieval. This is semantic reconciliation, not a full budget pass.

Also reconcile hot project state:

- New cross-cutting constraint or decision: allocate C/D anchor and add compact current directive.
- New unresolved project question: allocate Q anchor; reference that Q in Handoff later.
- Resolved Q: append resolution evidence to Log, delete Q, add D only if a continuing directive remains.
- Add every subsystem touched this session to its frontmatter `topics:` list; never remove an earlier session tag.
- Active topic without a COMMON definition: add its stable code and a short scope/search description, without session ids or current status.
- Inactive topic: delete its COMMON definition unless an active task or C/D/Q still needs the route. Historical session tags remain searchable.

Do not run the full word-budget pruning pass here.

## 4. Stop

Do not write Handoff mid-session. Return to normal work or the next task.
