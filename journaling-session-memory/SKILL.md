---
name: journaling-session-memory
description: Use when starting a session to resume previous work ("continue from last session", "pick up where we left off"), ending or handing off a session, checkpointing a milestone or low-context state, or trimming and compacting project session memory such as COMMON.md.
---

# Journaling Session Memory

Preserve continuity without loading session history on every start. Session files keep evidence; COMMON.md keeps the dense active project view.

## Route

- Resume or continue: read `references/onboard.md`.
- Milestone, decision, discovery, abandonment, or task switch: read `references/checkpoint.md`.
- Wrap up, end session, or low context: read `references/offboard.md`.
- Trim, compact, prune, or reduce COMMON: read `references/compact-common.md`.
- Creating/migrating a session file or resolving format ambiguity: read `references/session-format.md`.
- Creating/migrating COMMON or changing C/D/Q entries: read `references/common-format.md`.

## Project Layout

By default, session memory lives in `context/session_states/`:

```
context/session_states/
├── COMMON.md          - active project view; read every onboard
├── 0000-legacy.md     - migrated legacy state, when present
└── NNNN-<slug>.md     - chronological evidence plus handoff
```

Projects can override the folder in their project instructions with a line like:

```
session states: path/to/folder
```

Session ids are zero-padded sequence numbers; the next session takes highest id + 1. Slug is 2-4 words describing the session's main work.

## Authority

- Task tracker (`.tasks/`, see managing-tasks) owns task state. Never restate tracker status in COMMON.md beyond a task id reference.
- Project documents loaded for every supported host own the rules they state. Do not duplicate those rules in COMMON.md.
- Session Log owns chronological evidence, rationale, and retired history.
- Session Handoff owns continuity for the next session.
- COMMON.md owns current cross-cutting constraints, decisions, unresolved project questions, temporary redirects, and active retrieval routes.
- New evidence beats COMMON.md; reconcile COMMON at the same checkpoint.

## Scope

- Task-scoped fact: task note plus one session Log entry. Without tracker, Log only.
- Session-scoped event or handoff: session file only.
- Current project-wide directive or unresolved question: session evidence plus compact COMMON entry.
- Reusable failure pattern: relevant cross-host-loaded antipattern document plus session evidence; remove duplicate COMMON entry.

## Core Invariants

- Checkpoint while facts are fresh; offboard summarizes, never reconstructs.
- When work touches a COMMON subject or `RECHECK` event, classify the entry KEEP / CONDENSE / REPLACE / RETIRE / PROMOTE before continuing.
- COMMON is an active view, not history. Delete obsolete entries; keep redirects only for live inbound references.
- COMMON compaction is intentionally lossy. Retain only information worth recurring context cost; recover supporting evidence from session Logs before semantic removal.
- Preserve identifiers, conditions, exceptions, and provenance when compressing.
- Never persist secrets, credentials, or private user data; reference their location.
- Never rewrite session Log entries. Apply the correction window in `references/session-format.md`.

## Migration from preserving-session-memory

Handled at onboard, purely mechanical, no classification. See references/onboard.md Step 1.
