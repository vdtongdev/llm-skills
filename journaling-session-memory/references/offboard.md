# Offboard - Wrapping Up a Session

Follow these priorities in order when ending a session or when context is running low.

**Constraints:** Near-full context, limited tool calls. Write from memory - do NOT read project files to gather information. The only files you may read: the current session's journal file and COMMON.md. If checkpointing was done during the session, most of the work is already on disk; offboard is a finalization pass, not a memory dump.

Transcribe, don't judge. No compaction, no eviction, no doc rewrites - those need context, so they belong to onboard.

---

## Priority 1 - Finalize the Session File (MUST)

Non-negotiable. Every session ends with a finalized journal file. DO NOT spare tokens here - if the capsule is thin, the next session starts dumb.

If no session file was created at onboard (skill invoked late), create it now from the SKILL.md template - next id, frontmatter, and write Milestones retroactively from memory before the capsule.

1. **Milestones:** append any un-checkpointed events from this session. Do not reorder or reword existing lines.
2. **Run git state.** The capsule's `head:` and Uncommitted Changes come from here, not from memory:

   ```bash
   bash ~/.claude/skills/journaling-session-memory/scripts/git-state.sh
   ```

3. **Handoff Capsule:** write every section from the SKILL.md template. Guidance:
   - **Status:** one word - planning / implementing / testing / debugging / blocked
   - **What's Done:** one line per file touched this session, backtick path + short phrase. Compress this file's `done:` milestones; do not re-derive from memory. This session only - prior sessions' work lives in their own files
   - **Work Checklist:** only `[ ]` and `[-]` items. Be specific about partial progress: "PATCH done, DELETE not started", not "in progress"
   - **What's Next:** ordered, specific enough that the next agent starts cold without guessing
   - **Failed Approaches:** tracker projects - confirm each failure got a `task add-note` (add missing ones now) and leave the section out. No tracker - full entries here: what, what broke, WHY (root cause)
   - **Open Questions (session-scoped):** what needs user input for this work
   - **Uncommitted Changes:** from the git state above, not from memory - "All committed" / "Stashed as: session: <desc>" / the dirty state and why
   - **Docs That Will Need Reading:** docs and skills the next agent must load before touching code. In a tracker project (see /managing-tasks), the task already answers this: copy its `context[]` entries, and derive the rest from its `kind` via the project's CLAUDE.md task-kinds table. Add here only what neither field covers - if you find yourself adding much, the task's `context[]` is the better home for it
   - **Docs That May Need Updating:** only docs you know went stale from this session's changes. Don't guess. Don't fix them now - naming them is the handoff
   - **Retrieval Hints:** grep-able terms/paths/task-ids for when future work circles back here. Omit if nothing non-obvious
4. **Frontmatter:** set `finalized: true`, `head:` to the short hash from the git state above, and verify `branch:`, `tasks:`, `topics:` are current.

After this, the file is immutable forever.

---

## Priority 2 - Append to COMMON.md (MUST, bounded)

Append and tombstone only. Read it (allowed), then:

1. **Topic Index:** match-first - reuse existing topic names, subsystem-level. Add this session's id to touched topics, update the one-phrase state and `[open]/[done]` tags. New topic only if genuinely new subsystem.
2. **Promote project-scoped facts** from this session's milestones: new durable decisions -> Active Decisions with next anchor id (D-NN), the why, and `Evidence: <session id>`. New project-scoped open questions -> Open Questions (Q-NN). New conventions -> Constraints (C-NN). Task-scoped facts stay in task notes - do not promote them.
3. **Supersede, don't delete:** a decision overturned this session gets its old entry reduced to a Tombstone line (`[superseded by D-NN]: <one phrase>. See <session id>`) and the new entry added.

Do not count lines. Do not evict. Onboard Step 7 owns the budget; going over it here is expected.

---

## Priority 3 - Sync Task Tracker Status (SHOULD)

Skip entirely if `.tasks/` doesn't exist. Status transitions only:

```bash
task set-status <id> done|in-progress|blocked
task edit-subtask <parent-id> <sub-id> --status done
```

No `add-note` - that is checkpoint's job, at the moment the fact was learned. Do not reconstruct missed ones from memory.

Critically low context: skip this entirely and note the gap in What's Next. Onboard Step 5 reads the tracker anyway.

---

## Priority 4 - Report

No tool call - just text:

- 2-3 lines: what's done, what's next, anything needing user input
- Brief - the user can read the capsule for details
