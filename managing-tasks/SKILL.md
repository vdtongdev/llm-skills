---
name: managing-tasks
description: Project-local task tracker. YAML-per-task files under `.tasks/`, CLI at `~/.claude/skills/managing-tasks/bin/task`. Use when the user invokes `task ...`, when any producer skill (`/planning-tasks`, `/reviewing-code`, `/preserving-session-memory`) emits task creation or queries task state, or when resuming/ending a session in a project that has `.tasks/`. Triggers on "create a task", "list tasks", "what's next", "task import", "mark done", "archive task".
---

# Managing Tasks

Self-owned replacement for Task Master. Tasks live as YAML files under `.tasks/<prefix>-<slug>.yaml`; mutations serialized via a project-wide file lock; ULID identity survives renumber and branch merges. Primary consumer is Claude.

## When to use

- User invokes `task ...` or asks about task state
- `/planning-tasks` Step 6 emits a batch → `task import`
- `/reviewing-code` Pass 6 emits follow-up findings → `task new`
- `/preserving-session-memory` derives done/pending sections from `task list`

## Decision graph

```dot
digraph intent {
  "User intent" [shape=diamond];
  "User intent" -> "task new / task import" [label="create"];
  "User intent" -> "task list [--ready|--status|--touching]" [label="query many"];
  "User intent" -> "task show <id> / why <id>" [label="inspect one"];
  "User intent" -> "task next" [label="what now"];
  "User intent" -> "task set-status / edit / add-* / rm-*" [label="mutate"];
  "User intent" -> "task archive / cancel / reopen / renumber" [label="lifecycle"];
  "User intent" -> "task reindex / migrate" [label="recover / upgrade"];
}
```

## CLI entrypoint

Binary: `~/.claude/skills/managing-tasks/bin/task` (Node shim). Projects alias to `task` in shells.

Every command prints YAML on stdout (starts with `contract_version: 1`) or a formatted multi-line block for human-oriented commands (`list`, `show`, `deps`, `grep`, `why`, `next`). Errors go to stderr; exit code classifies the failure (see `references/exit-codes.md`).

Quick reference: `init | new | import | list | show | next | deps | grep | why | set-status | edit | add-file | rm-file | add-change | add-dep | rm-dep | add-subtask | edit-subtask | add-note | add-test | add-source | rm-source | move | rm | cancel | reopen | archive | reindex | renumber | migrate`.

Full flag and example spec: `references/cli-reference.md`.

## Project configuration

Read from project `CLAUDE.md` under a `/managing-tasks` block:

- Tasks directory — default `.tasks/`. Override rare; not currently wired.
- Archive policy — manual only (no auto-archive). Users run `task archive --older-than <days>` or `task archive --id <id>` explicitly.
- TDD subtask kinds — freeform `kind:` label on subtasks (e.g., `RED`, `GREEN`). Tracker does not enforce.
- Task kinds — freeform `kind:` label on the whole task (e.g., `coding`, `testing`, `docs`, `infra`). A **task-kinds table** in the project's `CLAUDE.md` maps each value to the skill to invoke and the antipatterns doc to load before working that task. Tracker stores the label but does not enforce it or read the table — the table is consumed by the agent (see "Proactive context loading" below). Recommended table shape:

  ```
  ## Task kinds (/managing-tasks)
  | kind    | invoke skill    | load doc                         |
  |---------|-----------------|----------------------------------|
  | coding  | /writing-code   | context/ANTIPATTERNS_CODING.md   |
  | testing | /testing-code   | context/ANTIPATTERNS_TESTING.md  |
  | docs    | -               | context/STYLE.md                 |
  ```

  Values are the project's own vocabulary — pick whatever kinds the project actually has. A task with no `kind`, or a `kind` absent from the table, just loads nothing extra.

No config file is required; the CLI works with defaults.

## Proactive context loading

The point of task-level `kind` is to remove the per-session "which skill/docs apply to this task?" guesswork. When you pick up a task to work on — via `task next` or `task show <id>` — both surface the task's `kind` if set (`next` appends ` kind:<domain>`; `show` includes a `kind:` field).

On seeing a `kind`, before touching code:

1. Look up the value in the project `CLAUDE.md` task-kinds table.
2. Invoke the mapped skill (if any) and read the mapped doc (if any).
3. Then start the task.

If the project has no task-kinds table, or the task has no `kind`, skip this — proceed as normal. This is agent behavior; the tracker does not invoke skills itself.

## Auto mode

"Auto mode" is when the user asks you to work tasks back-to-back without pausing for direction between each one (e.g. "run the tasks", "auto mode", "keep going through the queue"). It is opt-in — never enter it unless the user asks. When asked:

1. `task next` (or `task list --ready`) to pick the next actionable task.
2. Apply **Proactive context loading** above for that task's `kind`.
3. `task set-status <id> in-progress`, do the work, mark subtasks/`done` as you go.
4. Loop back to step 1 for the next ready task.

Stop the loop and hand back to the user when any of these hits:

- `task next` returns `no ready task` — the queue is drained or everything left is blocked.
- You get stuck: tried multiple approaches on one task with no progress → **Stop, Simplify, Ask** (do not thrash).
- The user interrupts.

Auto mode does **not**:

- Run `/reviewing-code` between tasks. Review is batch-end only, on the user's cadence (plan → break down → run → review), not per-task.
- Try to self-detect "context running low" and stop or offboard on its own. It cannot reliably measure that. The user watches context and interrupts; that interrupt is the offboard trigger, same as any session.

## Integration contract

Producer skills invoke the CLI and branch on `contract_version`. If the CLI returns a mismatched version, the producer must surface an actionable error, not silently continue.

Integration shapes (per command):

- `task new` → `{contract_version, id, uid, file}`
- `task import` → `{contract_version, label_map: {<label>: <id>}, created: <n>}`
- `task list [--compact]` → multi-line text (not YAML). Parse line-by-line if needed.
- `task show <id>` → YAML detail (all fields + `archived: bool`).
- `task why <id>` → multi-line text: title, goal, source list. Not YAML.
- Mutation commands → `{contract_version, id, ...delta}`.

Full per-command schemas: `references/integration-contract.md`.

## File format

Every task file: `schema: 1` at top; `uid` (ULID, immutable), `id` (human-readable string), `title`, `status` required. Optional: `kind`, `depends_on`, `depends_on_uids`, `goal`, `files[]`, `tests[]`, `notes[]`, `subtasks[]`, `sources[]`. `kind` is a freeform skill-domain label (e.g. `coding`, `testing`) that drives proactive context loading — see "Task kinds" under Project configuration. Filename prefix sets display order; ULID is identity. Full shape and rules: `references/file-format.md`.

## Invariants

- All writes are atomic (tempfile + fsync + rename + dir fsync).
- All mutations acquire a project-wide exclusive lock at `.tasks/.cache/lock` (proper-lockfile). Queries share the same lock — option A collapse, serialized; cost trivial for solo workflow.
- `done` requires all subtasks terminal (done|cancelled) and all deps terminal — unless `--force`.
- `add-dep` to a cancelled or archived task is rejected.
- `add-dep` that retroactively invalidates a `done` task is rejected — reopen first.
- `cancel` with active dependents is rejected without `--force`.
- `archive` refuses tasks referenced by active deps.
- `list` tolerates malformed task files (one `[?] INVALID` row per file); every other command hitting a malformed file returns exit 2 (not found) or exit 1 (internal error) depending on whether the malformed file is the target.

## Schema migration

Every file has `schema: 1`. CLI supports v1 only — any file with `schema != 1` is rejected (older → exit 3, newer → exit 6). No prior-version support until v2 ships. `task migrate --dry-run` prints the plan; no silent rewrites on other commands.

## Bootstrap

`task init` is idempotent: creates `.tasks/.cache/`, appends `.tasks/.cache/` to `.gitignore` if missing, rebuilds cache. Every mutation auto-creates `.tasks/` if absent.

Node deps (`yaml`, `proper-lockfile`, `ulid`) are pinned in the skill's `package.json` and installed under `~/.claude/skills/managing-tasks/node_modules/`. The shim checks for `node_modules/`; missing → exit 1 with install instruction.

## Maintenance

See `MAINTENANCE.md` for where new knowledge lands.
