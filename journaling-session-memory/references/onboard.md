# Onboard - Resuming a Session

Follow these steps in order when the user wants to continue from a previous session.

Onboard runs on fresh context. Judgment-heavy work (compaction, recovery, archive retrieval) belongs here, not at offboard.

---

## Step 1 - Locate the Journal (and Migrate if Needed)

Check the project's configured folder (see SKILL.md "Project Layout"). Default: `context/session_states/`.

**Folder exists:** proceed to Step 2.

**Folder missing, but legacy `context/SESSION_STATE.md` exists** (or the path a `session state:` line in project CLAUDE.md points to): migrate mechanically, zero classification:

1. Create the folder
2. `git mv` (or `mv` if untracked) the old file to `session_states/0000-legacy.md` - verbatim, no edits
3. Create `COMMON.md` from the SKILL.md template, empty except one index line:
   `- legacy [open]: 0000 - pre-migration state, unclassified`
4. Treat `0000-legacy.md` as the latest session file for the rest of onboard. It has no capsule or frontmatter; read it whole (same cost as the old skill's onboard)

Durable entries in the legacy file migrate lazily: when a session actually touches one, that session promotes it to COMMON.md or a task note. Entries nobody touches again just age out in the archive. Never do a bulk classification pass.

**Neither exists:** tell the user "No session state found - starting fresh." Run git state (Step 3) for general context, skip to Step 8 to ask what to work on, then do Step 9 (create the session file).

---

## Step 2 - Read COMMON.md + Latest Session File

The fixed read set, in order:

1. `COMMON.md` - whole file (it's budgeted small)
2. Latest session file (highest id) - Handoff Capsule first. Read the Milestones body only if the capsule is missing (unclean shutdown, see Step 4) or explicitly points into it

Do NOT read older session files yet - that's Step 6, and only if warranted.

Internalize from the capsule: Status, Work Checklist, What's Next, Failed Approaches (or task notes), Uncommitted Changes, Docs That Will Need Reading. From COMMON.md: constraints, active decisions, open questions, and which topics current work might touch.

---

## Step 3 - Check Git State

```bash
bash ~/.claude/skills/journaling-session-memory/scripts/git-state.sh
```

- **Stash from a previous session?** Flag to user: "Found stash: `<name>`. Apply it?" Wait for confirmation.
- **Branch mismatch** vs the latest session file's `branch:` frontmatter? Flag to user.
- **Dirty state that doesn't match the capsule's Uncommitted Changes?** Flag to user before touching anything - something changed outside Claude sessions.

---

## Step 4 - Unclean Shutdown Check

Signals the previous session died without offboarding (any one is enough to suspect):

- Latest session file has `finalized: false` (primary signal)
- Commits in `git log` newer than the file's `head:` hash
- Tracker shows task/subtask states the capsule doesn't mention

These are signals, not proof - hooks, rebases, or work outside Claude can explain git divergence. Report as **"previous session appears to have ended uncleanly"**, never as fact, and never silently "fix" anything.

Recovery, cheapest first:

1. The dead session's Milestones section - this is why checkpoints exist; whatever was checkpointed survived
2. `git log` + `git diff <head>..HEAD` - what actually changed since the last known state
3. Tracker notes written mid-session (`task show <id>`)
4. Last resort, offer, don't default: "I can dig through the previous session's transcript if the diff doesn't explain the state." Transcripts persist as JSONL under `~/.claude/projects/<project-dir>/` - verify the path exists before promising anything

After recovery: leave the dead file's `finalized: false` as-is (it is evidence), summarize reconstructed state to the user, and note the reconstruction in your own session file's first milestone.

---

## Step 5 - Load Task Tracker State

Skip if `.tasks/` doesn't exist.

1. `task show <id>` for each id in the latest session file's `tasks:` frontmatter - notes carry task-scoped context (failed approaches live here in tracker projects)
2. `task list --ready` - surface tasks whose deps are satisfied
3. Cross-reference with the capsule. Tracker is authoritative on task state; the journal is authoritative on narrative

---

## Step 6 - Targeted Archive Retrieval

Only when there is an active task. Never auto-read the archive.

1. Check the Topic Index: does current work touch an indexed topic? If yes, reading those sessions' capsules is expected - do it
2. Grep the archive with the task title/id, changed paths, and salient terms from the capsule's Retrieval Hints. Look at match counts and filenames first; read nothing yet
3. Read the capsule (not the body) of strong matches only. Escalate to a full session body only if its capsule confirms relevance
4. The index is advisory: a strong grep hit on an unindexed session is still eligible

Mid-task rule: if you hit a wall later in the session and suspect history matters, come back to this step - the archive doesn't expire.

---

## Step 7 - Compaction Obligation

```bash
grep -cv '^\s*$' COMMON.md
```

Over 120 nonblank lines: trim below 120 following SKILL.md's eviction order (full text always survives in the journal, so eviction is safe), or add a one-line note to COMMON.md recording why compaction isn't possible right now. Over 150: compaction is mandatory, no deferral.

While in the file: merge obviously-duplicate topics (match-first rule failed somewhere) and fix stale statuses you can verify from Steps 2-5. Don't touch entries you can't verify.

---

## Step 8 - Confirm with User

**Resuming:** "Resuming [task id/description]: [title]. [1-line status]. Next step: [action]. Proceed?"

**Fresh start:** ask what to work on.

Do NOT start implementing before the user confirms. Priorities may have changed since last session.

Also surface here, if applicable: docs flagged in "Docs That May Need Updating" (ask: update now or defer?), and anything Step 3/4 flagged.

After confirmation: read every doc and invoke every skill in the capsule's "Docs That Will Need Reading", then read `[-]` in-progress files from the checklist.

---

## Step 9 - Create This Session's File

Immediately after confirmation, before any implementation work:

1. Next id = highest existing id + 1, slug from the confirmed task
2. Write the file from the SKILL.md template: frontmatter (`finalized: false`, current branch, task ids, topics - reuse existing topic names), empty Milestones, no capsule yet
3. From here on, follow references/checkpoint.md triggers for the rest of the session

This file is the write-ahead log: if this session dies, the next onboard recovers from whatever reached Milestones.
