# Session File Format

One file records one agent session. It preserves chronological evidence and a compact handoff. Do not use it as the current project knowledge index.

## Template

```markdown
---
id: 0073
slug: dependency-cleanup
started: 2026-08-02
finalized: false
branch: master
head:
tasks: [T-14]
topics: [dependencies]
---

# Session 0073 - dependency-cleanup

## Log

- decision: <ruling plus rationale needed to understand it later>
- discovered: <fact and consequence>
- abandoned: <approach> - <failure> (root cause: <cause>)
- done: `<path>` - <result>
- retired: D-02 - <invalidation evidence>
- promoted: C-71 -> `context/ANTIPATTERNS_WORKFLOW.md`
- question: <unresolved project question; pending COMMON anchor when necessary>
- pending-common: <constraint/decision/question not yet added and why>
- correction: <session/entry> wrong; <correct fact>

## Handoff

### Work

- [x] `<path>`: <completed result>
- [-] `<path>`: <completed part>; <remaining part>
- [ ] `<path>`: <specific pending work>

### Next

1. <first cold-start action>
2. <next action>

### Questions

- Q-21
- pending COMMON Q: <question awaiting anchor after pruning>
- session: <question that does not belong in COMMON>

### State

- tree: clean
- load: `<path>`, `skill-name`
- avoid: <failed approach and root cause>
- retrieve: <non-obvious grep terms, paths, or task ids>
```

Omit empty optional lines and sections. Keep `Work`, `Next`, and `State`; write `tree: clean` explicitly when clean.

## Frontmatter

- `id`: zero-padded sequence; never reuse.
- `slug`: 2-4 words describing the main work.
- `started`: session start date.
- `finalized`: `false` until offboard completes.
- `branch`: branch at creation; refresh at offboard.
- `head`: short commit hash at offboard; empty while live.
- `tasks`: active tracker ids only.
- `topics`: reuse COMMON topic names; subsystem names, not feature names.

## Log

- Append events while context is fresh. Never reorder or rewrite existing log entries.
- Preserve rationale, rejected alternatives, and invalidation evidence here. COMMON keeps only current directives.
- Task-scoped discoveries also go to the task note when `.tasks/` exists.
- `retired`, `promoted`, and `correction` entries preserve history removed from COMMON.
- `pending-common` preserves a project entry deferred by the hard word ceiling; Handoff Work must point to it.

## Handoff

- `Work` is the complete file/action inventory. Do not duplicate it in a separate done section.
- `Next` orders only the immediate continuation.
- Project-level questions use COMMON `Q-NN`; session-only blockers use `session:`. When the hard ceiling prevents Q allocation, use `pending COMMON Q:` until next onboard.
- `load` lists only context not already supplied by task `kind` or `context[]`.
- `avoid` is required only without a task tracker; tracker projects keep failed approaches in task notes.
- `retrieve` is optional and contains only terms a future archive search would not infer.

## Correction Window

Only the active conversation that finalized the file may append `correction:` and refresh Handoff/frontmatter afterward. Any invocation entering through onboard creates a successor and records corrections there, even when no successor exists yet. Never rewrite Log entries.
