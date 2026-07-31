---
name: managing-tasks
description: Project-local task tracker. Use when the user invokes `task ...`, when any skill emits task creation or queries task state, or when resuming/ending a session in a project that has `.tasks/`. Triggers on "create a task", "list tasks", "what's next", "mark done", "archive task".
---

# Managing Tasks

Tasks live as YAML files under `.tasks/<prefix>-<slug>.yaml`; mutations serialized via a project-wide file lock; ULID identity survives renumber and branch merges.

## When to use

- User invokes `task ...` or asks about task state
- Any skill emits a task creation or query event
- Resuming or ending a session in a project that has `.tasks/`

## Decision graph

Frequent commands:

- task new / task get-new-uid
- task list
- task show <id> / why <id>
- task next
- task set-status / edit / `add-*` / `rm-*`
- task archive / cancel / reopen / renumber
- task verify / reindex / migrate

## CLI entrypoint

Binary: `${skills_dir}/managing-tasks/bin/task` (Node shim). Projects alias to `task` in shells. (~/.claude/skills for claude, ~/.codex/skills for codex, etc.)

Every command prints YAML on stdout (starts with `contract_version: 1`) or a formatted multi-line block for human-oriented commands (`list`, `show`, `deps`, `grep`, `why`, `next`). Errors go to stderr; exit code classifies the failure (see `references/exit-codes.md`).

Quick reference: `init | new | get-new-uid | list | show | next | deps | grep | why | set-status | edit | add-file | rm-file | add-change | add-dep | rm-dep | add-subtask | edit-subtask | add-note | add-test | add-source | rm-source | add-context | rm-context | move | rm | cancel | reopen | archive | verify | reindex | renumber | migrate`.

Full flag and example spec: `references/cli-reference.md`.

## Project configuration

Read from project `CLAUDE.md` under a `/managing-tasks` block:

- Tasks directory — default `.tasks/`
- Archive policy — manual only (no auto-archive). Users run `task archive --older-than <days>` or `task archive --id <id>` explicitly.
- TDD subtask kinds - freeform `kind:` label on subtasks (e.g., `RED`, `GREEN`). Tracker does not enforce.
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

- Task context - `context[]` on a task lists what to read or activate _beyond_ whatever the task's `kind` resolves to. `kind` carries the layer default, edited in one place; `context[]` carries this task's delta. An entry identical on every task of a layer belongs in the task-kinds table, not on the task. Nothing enforces that split; it is a review concern.

No config file is required; the CLI works with defaults.

## Proactive context loading

Two fields answer "which skill/docs apply to this task?" so you never re-derive it per session. `kind` resolves the layer default; `context[]` carries this task's delta. Load both before touching code:

1. `kind` - look the value up in the project `CLAUDE.md` task-kinds table. Invoke the mapped skill and read the mapped doc.
2. `context[]` - read or activate every entry (`kind: file | skill | doc`, `ref`, optional `why`). These are task-specific, so nothing else will supply them.
3. Then start the task.

Skip whichever is absent: no task-kinds table or no `kind` skips step 1, no `context[]` skips step 2. A task with neither loads nothing extra and proceeds as normal.

Run `task show <id>` before starting - it is the only command that emits both fields. `task next` appends ` kind:<domain>` and says nothing about `context[]`, so treat it as a pointer to the task, not as the full briefing.

This is agent behavior; the tracker resolves neither field and invokes nothing itself.

## Auto mode

"Auto mode" is when the user asks you to work tasks back-to-back without pausing for direction between each one (e.g. "run the tasks", "auto mode", "keep going through the queue"). It is opt-in — never enter it unless the user asks. When asked:

1. `task next` (or `task list --ready`) to pick the next actionable task.
2. `task show <id>`, then apply **Proactive context loading** above for that task's `kind` and `context[]`.
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
- `task get-new-uid [--count n]` → `{contract_version, uids: [<ulid>, ...]}`
- `task verify` → `{contract_version, ok, checked, problems: [...]}`; exit 4 when `problems` is non-empty
- `task list [--compact]` → multi-line text (not YAML). Parse line-by-line if needed.
- `task show <id>` → YAML detail (all fields + `archived: bool`).
- `task why <id>` → multi-line text: title, goal, source list. Not YAML.
- Mutation commands → `{contract_version, id, ...delta}`.

Full per-command schemas: `references/integration-contract.md`.

## File format

Every task file: `schema: 1` at top; `uid` (ULID, immutable), `id` (human-readable string), `title`, `status` required. Optional: `kind`, `depends_on`, `depends_on_uids`, `goal`, `files[]`, `tests[]`, `notes[]`, `subtasks[]`, `sources[]`, `context[]`. `kind` (freeform skill-domain label, e.g. `coding`, `testing`) and `context[]` (per-task reading list) together drive proactive context loading - see "Task kinds" and "Task context" under Project configuration. Filename prefix sets display order; ULID is identity. Full shape and rules: `references/file-format.md`.

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
