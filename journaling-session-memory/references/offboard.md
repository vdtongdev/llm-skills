# Offboard - Finalize Handoff

Resolve `<state-dir>` from the project override or default in SKILL.md. Low-context rule: summarize recorded state; do not rediscover it. Read only the current session file and COMMON. Load a format reference only for a missing/legacy structure or a required COMMON write. Use targeted task commands when needed.

## 1. Finish the Session Log

Append only meaningful events missed since the last checkpoint. Do not reconstruct detailed history from project files.

If no current session file exists, create one from `session-format.md`, then write the smallest accurate Log possible.

## 2. Capture Minimal Git State

Run:

```bash
git branch --show-current
git rev-parse --short HEAD
git status --short
```

Use branch, HEAD, and tree summary for frontmatter and Handoff. Do not query recent commits or stashes unless the session already depends on them.

## 3. Write Handoff

Use the current Handoff shape. Read `session-format.md` only when Handoff is missing, legacy, or ambiguous:

- `Work`: one complete checklist; include finished, partial, pending, and stale-doc work.
- `Next`: ordered cold-start actions only.
- `Questions`: COMMON Q ids plus session-only blockers.
- `State`: tree summary; exceptional context to load; failed approach only without tracker; non-obvious retrieval hints.

Derive Handoff from Log and current knowledge. Do not reread project files.

Set:

- `finalized: true`
- current `branch`
- current short `head`
- current task ids and topics

This active conversation may append corrections and refresh Handoff after finalization. A later onboard always creates a successor. Never rewrite Log entries.

## 4. Bounded COMMON Reconciliation

Checkpoint should already own semantic reconciliation. At offboard:

1. Update active Topics for this session; delete completed Topics without a live task or C/D/Q route.
2. Run `wc -w` on the resolved COMMON path and compare it with the declared budget.
3. Process only uncheckpointed project decisions, constraints, questions, retirements, or promotions still in memory, and only when the result remains below the hard ceiling.

Do not perform a broad pruning investigation under low context. Whenever an entry is deferred because it would reach the hard ceiling:

1. Append `pending-common:` to Log with the complete directive/question.
2. For a question, use temporary Handoff text `pending COMMON Q: <question>`.
3. Add this first Handoff work item:

```markdown
- [ ] `COMMON.md`: prune below hard ceiling; reconcile pending Log entries
```

The next onboard performs evidence-based pruning before normal work.

## 5. Sync Tracker Status

Skip without `.tasks/`. Apply known status transitions only. Do not reconstruct missing task notes at offboard.

Critically low context: skip tracker sync and put the exact gap in Handoff Work.

## 6. Report

Tell the user what finished, the immediate next action, and any question requiring input. Keep it shorter than Handoff.
