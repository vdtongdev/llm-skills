# Offboard — Wrapping Up a Session

Follow these priorities in order when ending a session or when context is running low.

**Constraints:** Near-full context, limited tool calls => Write from memory only — do NOT read files to gather information.

**One exception:** Reading the existing SESSION_STATE.md itself is allowed — you need it to preserve "What's Done" entries from earlier sessions. This is the only file you should read during offboard.

---

## Priority 1 — Write SESSION_STATE.md (MUST)

- This is non-negotiable. Every session must end with an updated SESSION_STATE.md.
- DO NOT spare tokens here, even if your token limit is close. Be thorough, don't cut corners.
- If not done properly, the next session will lack context and be dumb.

**Path:** Use the project's configured path (see SKILL.md "Project Configuration"). Default: `context/SESSION_STATE.md`. Create the `context/` directory if it doesn't exist.

**Process:**

1. Read the existing SESSION_STATE.md (if it exists) to preserve "What's Done" entries from earlier sessions
2. Update it with current session state using the template from SKILL.md — write everything else from memory
3. Write the file

### Section-specific guidance

**Task:** Use tracker ID + title (from `task show <id>`) if `.tasks/` exists. Otherwise, free-text description.

**Branch:** git branch name.

**Status:** One word — `planning`, `implementing`, `testing`, `debugging`, or `blocked`.

**What's Done:**

- Graduate any `[x]` items from the Work Checklist here
- One line per file: backtick-wrapped path + short phrase
- If continuing from a previous session, preserve earlier entries unless the overall task is fully complete

**Work Checklist:**

- Only `[ ]` and `[-]` items
- If you completed a file this session, it should NOT be here — move it to What's Done
- Be specific about partial progress: "x done, y not started, z blocked" instead of "in progress".

**What's Next:** Ordered list of immediate next steps. Be specific enough that the next agent knows exactly where to start.

**Failed Approaches:** Highest-value section. Without it, the next agent repeats your mistakes. Include:

- What you tried
- What went wrong
- **WHY** it failed (root cause)
- Any relevant error messages or observations

**Uncommitted Changes:** One of:

- "All committed" — clean working tree
- "Stashed as: session: `<description>`" — if you stashed
- Description of dirty state — what files are modified and why they aren't committed

**Discussion Summary:**

- Optional if the session is only about implementation/operations
- Include if there were decision-making, structuring, or longterm planning discussions with the user

**Decisions & Open Questions:** Second highest-value section. Include:

- Architectural decisions made during this session and their reasoning
- User preferences or instructions that affect implementation
- Open questions that still need user input
- Any constraints discovered during implementation

**Docs That Will Need Reading:**

- List all doc files for next agent to read. Must be relevant to the current tasks and next tasks.
- E.g: if this session and next session are working on writing code and tests, list out TESTING.md, ANTIPATTERNS_CODING.md, etc.

**Docs That May Need Updating:**

- Only include if code changes this session invalidated documentation. Reference doc name + what changed
- The doc list should come from whatever docs the project maintains (often listed in CLAUDE.md's context table or similar)
- Don't guess — only flag docs you know are stale.

---

## Priority 2 — Sync task tracker (SHOULD)

Skip entirely if `.tasks/` doesn't exist.

**Update tracker state for work touched this session:**

- `task set-status <id> done` — completed top-level tasks
- `task set-status <id> in-progress` / `blocked` — reflect current state
- `task edit-subtask <parent-id> <sub-id> --status done` — subtask transitions
- `task add-note <id> "<implementation context>"` — non-obvious details the next agent needs (one note per meaningful context chunk)

**Derive SESSION_STATE sections from tracker output:**

- "What's Done" list: `task list --status done --compact` output, trimmed to this session's scope
- "Work Checklist" list: `task list --status in-progress,pending,blocked --compact` output
- Prepend each derived section with:
  `<!-- Generated from task tracker; edit tasks via 'task' CLI, not this file -->`
- Tracker is source of truth; manual edits to these sections are lost on next offboard

This is "should" not "must" — if context is critically low, SESSION_STATE.md narrative is sufficient. Tracker can be updated at the start of the next session.

---

## Priority 3 — Update Context Docs (ONLY IF TOKENS ALLOW)

Only do this if you have remaining context budget. If not, the "Docs That May Need Updating" section in SESSION_STATE.md handles the handoff.

- Check if any project documentation is now stale due to this session's code changes
- Look for doc references in the project's CLAUDE.md (context tables, doc lists, etc.)
- Don't restructure docs — just patch to match reality
- Ask user: "Update docs now, or defer to next session?"

Common docs that go stale:

- File/folder structure docs — when new files or folders are added
- Schema/database docs — when tables, columns, or relationships change
- Test inventory docs — when tests are added, removed, or changed
- README/setup docs — when env vars or setup steps change

---

## Priority 4 — Report

No tool call needed — just output text to the user:

- 2-3 line summary: what's done, what's next, anything needing user input
- Keep it brief — the user can read SESSION_STATE.md for details
