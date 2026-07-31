# Offboard - Wrapping Up a Session

Follow these priorities in order when ending a session or when context is running low.

**Constraints:** Near-full context, limited tool calls. Write from memory - do NOT read project files to gather information. The only files you may read: the current session's journal file and COMMON.md. If checkpointing was done during the session, most of the work is already on disk; offboard is a finalization pass, not a memory dump.

---

## Priority 1 - Finalize the Session File (MUST)

Non-negotiable. Every session ends with a finalized journal file. DO NOT spare tokens here - if the capsule is thin, the next session starts dumb.

If no session file was created at onboard (skill invoked late), create it now from the SKILL.md template - next id, frontmatter, and write Milestones retroactively from memory before the capsule.

1. **Milestones:** append any un-checkpointed events from this session. Do not reorder or reword existing lines.
2. **Handoff Capsule:** write every section from the SKILL.md template. Guidance:
   - **Status:** one word - planning / implementing / testing / debugging / blocked
   - **What's Done:** one line per file touched this session, backtick path + short phrase. This session only - prior sessions' work lives in their own files
   - **Work Checklist:** only `[ ]` and `[-]` items. Be specific about partial progress: "PATCH done, DELETE not started", not "in progress"
   - **What's Next:** ordered, specific enough that the next agent starts cold without guessing
   - **Failed Approaches:** tracker projects - confirm each failure got a `task add-note` (add missing ones now) and leave the section out. No tracker - full entries here: what, what broke, WHY (root cause)
   - **Open Questions (session-scoped):** what needs user input for this work
   - **Uncommitted Changes:** "All committed" / "Stashed as: session: <desc>" / describe the dirty state and why
   - **Docs That Will Need Reading:** docs and skills the next agent must load before touching code. In a tracker project (see /managing-tasks), the task already answers this: copy its `context[]` entries, and derive the rest from its `kind` via the project's CLAUDE.md task-kinds table. Add here only what neither field covers - if you find yourself adding much, the task's `context[]` is the better home for it
   - **Docs That May Need Updating:** only docs you know went stale from this session's changes. Don't guess
   - **Retrieval Hints:** grep-able terms/paths/task-ids for when future work circles back here. Omit if nothing non-obvious
3. **Frontmatter:** set `finalized: true`, `head:` to the current short hash (`git rev-parse --short HEAD`), and verify `branch:`, `tasks:`, `topics:` are current.

After this, the file is immutable forever.

---

## Priority 2 - Update COMMON.md (MUST, bounded)

Small, surgical edits - never a rewrite. Read it (allowed), then:

1. **Topic Index:** match-first - reuse existing topic names, subsystem-level. Add this session's id to touched topics, update the one-phrase state and `[open]/[done]` tags. New topic only if genuinely new subsystem.
2. **Promote project-scoped facts** from this session's milestones: new durable decisions -> Active Decisions with next anchor id (D-NN), the why, and `Evidence: <session id>`. New project-scoped open questions -> Open Questions (Q-NN). New conventions -> Constraints (C-NN). Task-scoped facts stay in task notes - do not promote them.
3. **Supersede, don't delete:** a decision overturned this session gets its old entry reduced to a Tombstone line (`[superseded by D-NN]: <one phrase>. See <session id>`) and the new entry added.
4. **Budget check:** `grep -cv '^\s*$' COMMON.md`. Over 120: evict per SKILL.md's order if tokens allow; if context is critically low, leave it - onboard's Step 7 is obligated to compact. Never exceed 150 without at least converting superseded entries to tombstones.

---

## Priority 3 - Sync Task Tracker (SHOULD)

Skip entirely if `.tasks/` doesn't exist.

- `task set-status <id> done` - completed top-level tasks
- `task set-status <id> in-progress` / `blocked` - reflect current state
- `task edit-subtask <parent-id> <sub-id> --status done` - subtask transitions
- `task add-note <id> "<context>"` - any non-obvious implementation context not yet noted (checkpointing should have caught most of this at the moment it was learned)

If context is critically low, the capsule alone is sufficient - the tracker can be synced at next onboard. Note the gap in the capsule's What's Next.

---

## Priority 4 - Update Context Docs (ONLY IF TOKENS ALLOW)

Only with remaining budget; otherwise the capsule's "Docs That May Need Updating" handles the handoff.

- Patch docs invalidated by this session's changes (structure docs, schema docs, README env vars)
- Don't restructure - just match reality
- Ask user: "Update docs now, or defer to next session?"

---

## Priority 5 - Report

No tool call - just text:

- 2-3 lines: what's done, what's next, anything needing user input
- Brief - the user can read the capsule for details
