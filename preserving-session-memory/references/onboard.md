# Onboard — Resuming a Session

Follow these steps in order when the user wants to continue from a previous session.

---

## Step 1 — Find and Read SESSION_STATE.md

Check the project's configured path (see SKILL.md "Project Configuration"). Default: `context/SESSION_STATE.md`.

If the file doesn't exist, tell the user: "No session state found — starting fresh." Then run git state (Step 2) for general context, skip Steps 3–5, and go straight to Step 6 to confirm direction with the user.

If the file exists, internalize these key sections before proceeding:

- **Task** — what to work on
- **Docs That Will Need Reading** — doc files and skills to load before starting, not after
- **Failed Approaches** — what NOT to try again (highest value — don't skip this)
- **Work Checklist** — what's incomplete or in-progress
- **Uncommitted Changes** — is the working tree dirty or stashed?
- **Discussion Summary** — how prior decisions were reached (if present)
- **Decisions & Open Questions** — context that shaped the approach

---

## Step 2 — Check Git State

Run the git state script:

```bash
bash ~/.claude/skills/preserving-session-memory/scripts/git-state.sh
```

**Stash from previous session?**

- If stash exists, flag to user: "Found stash: `<name>`. Apply it?"
- Wait for user confirmation before applying

**Uncommitted changes that don't match SESSION_STATE?**

- Flag to user before touching anything
- Something may have changed outside of Claude sessions

**Branch mismatch?**

- If current branch doesn't match SESSION_STATE's Branch field, flag to user

---

## Step 3 — Load task tracker state (if available)

Skip this step if:

- `.tasks/` directory doesn't exist, OR
- SESSION_STATE has no Task field or no tracker ID in it

If the tracker is present and a task ID exists:

1. `task show <id>` — full detail including notes, subtasks, sources.
2. Check subtask statuses — some may already be `done` or `in-progress`.
3. Read `notes` entries for implementation context logged previously.
4. `task list --ready` — surface tasks whose deps are satisfied.
5. Cross-reference tracker output with SESSION_STATE. Tracker is authoritative on task state. If narrative (Failed Approaches, Decisions) conflicts, SESSION_STATE is more recent.

---

## Step 4 — Read Key Files

- Read every doc and invoke every skill listed in SESSION_STATE's "Docs That Will Need Reading" section — do this before reading anything else, it's the point of that section
- Read files from SESSION_STATE "Work Checklist" that are marked `[-]` (in-progress) or relevant `[ ]` (not started) items you'll work on next
- Do NOT re-read all context docs — only read task-relevant ones
- Do NOT re-read completed files unless you need to understand their interface for current work

---

## Step 5 — Check Doc Staleness

If SESSION_STATE has a "Docs That May Need Updating" section:

1. Check when each flagged doc was last modified (`git log -1 --format="%h %ci" -- <path>`)
2. Compare against the work described in SESSION_STATE
3. If a doc appears stale, ask user: "SESSION_STATE flags `[doc]` as potentially outdated because `[reason]`. Update now or defer?"
4. If user says update — patch the doc, then proceed to task
5. If user says defer — note it and move on

If no "Docs That May Need Updating" section exists, skip this step.

---

## Step 6 — Confirm with User

**If resuming from SESSION_STATE**, format your summary as:

> "Resuming [task ID/description]: [title]. [1-line status]. Next step: [action]. Proceed?"

**If no SESSION_STATE was found** (fresh start), ask the user what they'd like to work on instead of summarizing prior state.

**Do NOT start implementing before user confirms.**

This gate exists because the user may have changed their mind about priorities, or new context may have emerged since the last session.
