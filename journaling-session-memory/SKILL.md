---
name: journaling-session-memory
description: Use when starting a session to resume previous work ("continue from last session", "pick up where we left off"), completing a defined goal or task, ending or handing off a session, or trimming and compacting project session memory such as COMMON.md.
---

# Journaling Session Memory

Preserve continuity without loading session history on every start. Session files keep evidence; COMMON.md keeps the dense active project view.

## Route

- Resume or continue: read `references/onboard.md`.
- Completed defined goal or task: read `references/checkpoint.md`.
- End or hand off a session: read `references/offboard.md`.
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
- New evidence beats COMMON.md; reconcile COMMON at the next checkpoint or offboard.

## Scope

- Task-scoped fact: managing-tasks records it when it occurs. Batch it into the session Log when the task finishes. Without a tracker, use the Log only.
- Session-scoped event or handoff: record it during offboard.
- Current project-wide directive or unresolved question: record session evidence and update COMMON at the next checkpoint or offboard.
- Reusable failure pattern: update the relevant cross-host-loaded antipattern document, then record session evidence at the next checkpoint or offboard. Remove any duplicate COMMON entry then.

## Core Invariants

- Checkpoint only after a defined goal or task finishes. Offboard when the session ends or hands off.
- A goal is the current user-authorized outcome. A task is a top-level tracker task or explicit untracked assignment established before work starts.
- Agent-created steps, subtasks, and file groups never qualify as checkpoint boundaries.
- When completed work touches a COMMON subject or `RECHECK` event, classify the entry KEEP / CONDENSE / REPLACE / RETIRE / PROMOTE at the next checkpoint or offboard.
- COMMON is an active view, not history. Delete obsolete entries; keep redirects only for live inbound references.
- COMMON compaction is intentionally lossy. Retain only information worth recurring context cost; recover supporting evidence from session Logs before semantic removal.
- Preserve identifiers, conditions, exceptions, and provenance when compressing.
- Never persist secrets, credentials, or private user data; reference their location.
- Never rewrite session Log entries. Apply the correction rules in `references/session-format.md`.

## Human-Facing References

- When speaking directly to the user, state the meaning before any C/D/Q anchor. Give enough context to understand it without opening `COMMON.md`.

Examples:

```text
BAD: Q-02 is still open. Do you want to answer it?

GOOD: The refresh-token revocation strategy is still unresolved (Q-02).
Do you want to decide it now?

BAD: According to D-17, this file will be removed.

GOOD: `prd_draft.md` will be removed without asking after the official PRD passes review (D-17).
```

## Migration from preserving-session-memory

Handled at onboard, purely mechanical, no classification. See references/onboard.md Step 1.
