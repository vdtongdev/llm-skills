# Checkpoint - Mid-Session Milestones

The current session's journal file is a write-ahead log. State is written when it's hot and cheap, not reconstructed at offboard when context is exhausted. A crashed session loses only the tail since the last checkpoint.

## Triggers

Checkpoint when any of these happens:

- **User makes a decision** that affects implementation (architecture, preference, scope)
- **An approach is abandoned** - record the root cause NOW, while it's fresh; this is the single highest-value thing to preserve
- **A meaningful milestone lands** - subtask done, tests passing, a file completed
- **The task switches** - update `tasks:`/`topics:` frontmatter along with the milestone line
- **Before a risky operation** (big refactor, destructive command, dependency upgrade)
- **A low-context warning appears** - do a full offboard instead (references/offboard.md)

## What to Write

A checkpoint is 1-5 lines appended to the current session file's Milestones. Prefix with the kind:

```
- decision: <what was decided and why, attribute user calls to the user>
- abandoned: <approach> - <what broke> (root cause: <why>)
- done: `path/to/file` - <what>
- switched: <from -> to, why>
- note: <constraint or discovery worth surviving a crash>
```

Task-scoped facts go to the tracker at the same moment, not just the journal:

- Failed approach or discovered constraint for task X, and `.tasks/` exists: `task add-note <id> "<the fact, with root cause>"` plus the one-line milestone
- Subtask finished: `task edit-subtask <parent-id> <sub-id> --status done`

## What NOT to Do

- Do NOT touch COMMON.md at checkpoints - promotion happens once, at offboard. One edit site, not many.
- Do NOT edit or reword earlier milestone lines - append-only, corrections go in the Corrections section.
- Do NOT write the Handoff Capsule mid-session - that's offboard's finalization pass.
- Do NOT narrate routine work ("read file X", "ran tests") - milestones are for state the next agent couldn't cheaply rediscover.

## Cost Discipline

A checkpoint should cost seconds, not minutes: append a few lines, optionally one tracker command, back to work. If a checkpoint is turning into a paragraph, write the one-line version in the milestone and put the paragraph in a task note.
