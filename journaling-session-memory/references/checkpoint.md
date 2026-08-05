# Checkpoint - Record Hot State

Checkpoint when context is accurate and cheap. A crash should lose only work since the last meaningful event.

## Triggers

- User decision or correction
- New constraint, failure mode, or project fact
- Abandoned approach
- Completed subtask or meaningful file group
- Task or subsystem switch
- Dependency, tool, configuration, migration, or workaround change
- Before risky work
- Low context: use `offboard.md` instead

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

## 2. Update Task-Owned State

Skip without `.tasks/`.

- Task-scoped discovery or failure: `task add-note <id> "<fact and root cause>"`.
- Finished subtask: `task edit-subtask <parent> <subtask> --status done`.
- Do not copy task status into COMMON.

## 3. Reconcile COMMON

Derive touch keys from the event:

- changed paths and symbols;
- package, tool, service, or command names;
- issue and task ids;
- workaround, migration, or configuration names;
- explicit `RECHECK` event.

Search COMMON for those keys, then include any C/D/Q whose subject is affected without a literal match. Do not audit unrelated entries. Read `common-format.md` before changing COMMON or when classification is unclear. For every affected entry, choose:

- `KEEP`: still binds; no write.
- `REPLACE`: allocate a new anchor, append replacement evidence to Log, remove old entry, add Redirect only for a live inbound reference.
- `RETIRE`: append invalidation evidence to Log, then delete entry.
- `PROMOTE`: update a permanent document loaded for every supported host, append promotion to Log, then delete entry. If loading is ambiguous, KEEP.

Never leave an affected entry unclassified.

Also reconcile hot project state:

- New cross-cutting constraint or decision: allocate C/D anchor and add compact current directive.
- New unresolved project question: allocate Q anchor; reference that Q in Handoff later.
- Resolved Q: append resolution evidence to Log, delete Q, add D only if a continuing directive remains.
- Completed topic: delete it unless an active task or C/D/Q still needs its archive route.

Do not run the full word-budget pruning pass here.

## 4. Stop

Do not write Handoff mid-session. Return to the active task.
