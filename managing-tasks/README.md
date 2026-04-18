# managing-tasks

A project-local task tracker for Claude Code projects. Tasks are plain YAML files under `.tasks/` in your repo. You manage them with a CLI; Claude Code skills can create and update them automatically during planning, review, and session handoff.

## Who controls it

**You** — run `task` commands directly to create, inspect, and update tasks.

**Claude Code skills** — `/planning-tasks` generates task batches after feature planning; `/reviewing-code` can log follow-up findings as tasks; `/preserving-session-memory` reads task state during session handoff. Claude acts on your behalf but does not run autonomously; you review tasks before any work begins.

**The files** — every task is a plain YAML file. You can open them in any editor, commit them, and diff them like any source file. Use the CLI for creating, renaming, and changing state; edit by hand only for fields the CLI does not expose, and keep required fields intact (`schema`, `uid`, `id`, `title`, `status`).

---

## Before you start

- Node.js is required (v18+)
- The CLI lives at `~/.claude/skills/managing-tasks/bin/task` — it is machine-wide, not project-scoped
- `.tasks/` is project-scoped — each repo gets its own task list
- Install dependencies once, per machine:

```bash
cd ~/.claude/skills/managing-tasks && npm install
```

---

## Setup

**1. Install dependencies** (one-time, per machine — see above)

**2. Initialize the project** (once per repo):

```bash
~/.claude/skills/managing-tasks/bin/task init
```

This creates `.tasks/`, `.tasks/.cache/`, and adds `.tasks/.cache/` to `.gitignore`. Safe to run multiple times.

**3. Add a shell alias** (optional but recommended):

```bash
# ~/.bashrc or ~/.zshrc
alias task="~/.claude/skills/managing-tasks/bin/task"
```

After this, all examples below use `task` directly.

---

## First 5 minutes

The most common daily use is checking what needs doing and updating state:

```bash
task list            # see active tasks
task list --ready    # only tasks whose dependencies are done
task show 3          # full detail for task 3
task next            # what to work on next
task set-status 3 in-progress
task set-status 3 done
```

Tasks are listed in prefix order (the numeric prefix in their filename). Status flows: `pending` → `in-progress` → `done` or `cancelled`. A task can also be `blocked` — that marks it as waiting on something external without removing it from the active list.

---

## Core concepts

### What a task looks like

```yaml
# .tasks/010-add-login-endpoint.yaml
schema: 1
uid: 01J8KQ2N5F3M7P9X4Y6Z0W1V2R   # stable identity — never changes
id: "3"                              # human-readable — can change on renumber
title: Add login endpoint
status: pending
depends_on: ["2"]
goal: Expose POST /auth/login returning a JWT on success.
files:
  - path: backend/routers/auth.py
    kind: create
sources:
  - kind: prd
    ref: context/prd-auth.md#implementation-details
```

**Three identity layers:**

| | Numeric `id` | Filename prefix | ULID `uid` |
|---|---|---|---|
| Example | `"3"` | `010` | `01J8KQ...` |
| Human-readable | ✓ | ✓ | ✗ |
| Stable across renumber | ✗ | ✗ | ✓ |
| Use for | CLI commands | Display order | Merges, cross-branch refs |

> **Warning:** numeric IDs and filename prefixes can change after `task renumber` or batch import. Use task titles or ULIDs when you need stable references in commit messages or notes.

### Task lifecycle

```
pending → in-progress → done
                      → cancelled
```

A task can be `blocked` at any stage — it stays in the active list but signals that work is waiting on something. `done` and `cancelled` are terminal: a done task with open subtasks or unresolved dependencies is rejected unless you pass `--force`.

### Removing a task: archive vs cancel vs rm

| Command | What it does | File kept? | Appears in history? | Use when |
|---------|-------------|------------|---------------------|----------|
| `task cancel <id>` | marks status=cancelled | Yes | Yes | work is abandoned but you want a record |
| `task archive --id <id>` | moves file to `.tasks/archived/` | Yes (archived) | Yes | done task is cluttering the active list |
| `task rm <id>` | deletes the file | No | No | task was created by mistake |

`cancel` and `archive` are reversible (`task reopen` undoes both). `rm` is not.

### Subtasks

Subtasks break a task into tracked steps without creating separate top-level tasks. A common use is TDD — one RED subtask for the failing test, one GREEN subtask for the implementation:

```bash
task add-subtask 3 1 "Write failing test for POST /auth/login" --kind RED
task add-subtask 3 2 "Implement login handler" --kind GREEN
```

Address subtasks with dotted notation: `task show 3.1`, `task edit-subtask 3 1 --status done`.

---

## End-to-end example

```bash
# Create a task
task new "Add user avatar upload" --goal "Allow users to upload a profile photo."

# It's task 4. Start working on it.
task set-status 4 in-progress

# Something is blocking you — waiting on design sign-off.
task set-status 4 blocked
task add-note 4 "Blocked: waiting on design review in Figma."

# Design approved. Resume.
task set-status 4 in-progress
task set-status 4 done

# A week later, tidy up completed tasks.
task archive --older-than 7
```

---

## Common workflows

### Daily use

```bash
task list --ready    # what can I start?
task next            # what should I do right now?
task show 5          # what does task 5 involve?
task set-status 5 in-progress
# ... do the work ...
task set-status 5 done
```

### TDD with subtasks

```bash
task new "POST /auth/login endpoint" --goal "Return JWT on valid credentials."
# Say it becomes task 6.
task add-subtask 6 1 "Failing test: POST /login returns 401 with bad credentials" --kind RED
task add-subtask 6 2 "Failing test: POST /login returns 200 with JWT on success" --kind RED
task add-subtask 6 3 "Implement login handler" --kind GREEN

task set-status 6 in-progress
# Write failing tests first (RED subtasks)
task edit-subtask 6 1 --status done
task edit-subtask 6 2 --status done
# Implement (GREEN subtask)
task edit-subtask 6 3 --status done
task set-status 6 done
```

### Session handoff

When you end a session with Claude, `/preserving-session-memory` reads `task list` to populate the session state document. When you resume, it reads `task list --ready` to surface what to pick up next. You do not need to run any task commands for this — Claude handles it automatically.

### Importing a planned batch

After `/planning-tasks` finishes, it produces a batch file at `.tasks/.import-<feature>.yaml` and submits it with `task import`. You can review the file before it is submitted and edit it. If the import succeeds, all tasks are created atomically — if any task is invalid, none are created.

If Claude has already submitted the import, you can inspect created tasks immediately:

```bash
task list
task deps 7    # see dependencies for task 7
```

---

## Claude Code skill integrations

| Skill | What it does with tasks |
|-------|------------------------|
| `/planning-tasks` | Generates a batch of tasks after feature planning; submits via `task import` |
| `/reviewing-code` | May create follow-up tasks from review findings via `task new` |
| `/preserving-session-memory` | Reads task state on session start/end; does not create tasks |

Each skill's own `SKILL.md` documents the exact commands it uses and when.

### When to run `task` yourself vs let Claude handle it

- **Let Claude handle it** during `/planning-tasks`, code review, and session start/end — the skills wire into the tracker automatically
- **Run `task` yourself** to check status, update state during work, add notes, or triage what to do next
- **Always review** tasks Claude creates before starting work — you can edit, split, or remove them

---

## Troubleshooting

### Task is missing from `task list`

Default `list` hides `done` and `cancelled` tasks. Try:
```bash
task list --all        # include done and cancelled
task list --archived   # include archived
task grep "keyword"    # search across all fields
```

### Task numbers changed unexpectedly

Numeric IDs and filename prefixes change after `task renumber` or a batch import. This is expected — use `task grep` or ULID to find a task by content if you lost track of its number.

### Merge conflict in `.tasks/`

YAML task files can conflict if two branches create tasks with the same filename prefix. Resolve by keeping both files (rename one's prefix if needed), then run `task reindex` to rebuild the cache:
```bash
task reindex
task list    # verify both tasks appear correctly
```

### Lock appears stuck

The lock file lives at `.tasks/.cache/lock`. If a command died mid-execution, it may be stale. `proper-lockfile` detects stale locks automatically via mtime. If the lock persists beyond 10 seconds with no active command, delete it manually:
```bash
rm .tasks/.cache/lock*
task reindex
```

### Malformed task file / validation error

`task list` will show the file as `[?] INVALID`. Fix or remove the file manually, then run `task reindex`.

### Migration from an older schema version

```bash
task migrate --dry-run    # see what would change
task migrate              # apply changes
```

---

## Reference docs

- `references/cli-reference.md` — every command, flag, and exit code
- `references/file-format.md` — full YAML schema
- `references/integration-contract.md` — producer/consumer shapes for skill authors
- `SKILL.md` — LLM-facing integration guide
- `MAINTENANCE.md` — where to add new commands, routing rules, doc thresholds
