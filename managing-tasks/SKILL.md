---
name: managing-tasks
description: Project-local task tracker. Use when the user invokes `task ...`, when any skill emits task creation or queries task state, or when resuming/ending a session in a project that has `.tasks/`. Triggers on "create a task", "list tasks", "what's next", "mark done", "archive task".
---

# Managing Tasks

Tasks live as YAML files under `.tasks/<prefix>-<slug>.yaml`; mutations serialized via a project-wide file lock; ULID identity survives renumber and branch merges.

## CLI entrypoint

Binary: `~/.claude/skills/managing-tasks/bin/task` (Node shim). Both hosts use this canonical executable and its installed dependencies. Projects may alias it to `task` in shells.

Every command prints YAML on stdout (starts with `contract_version: 1`) or a formatted multi-line block for human-oriented commands (`list`, `show`, `deps`, `grep`, `why`, `next`). Errors go to stderr; exit code classifies the failure (see `references/exit-codes.md`).

Quick reference: `init | new | get-new-uid | list | show | next | deps | grep | why | set-status | edit | add-file | rm-file | add-change | add-dep | rm-dep | add-subtask | edit-subtask | add-note | add-test | add-source | rm-source | add-context | rm-context | move | rm | cancel | reopen | archive | verify | reindex | renumber | migrate`.

Full flag and example spec: `references/cli-reference.md`.

## Project configuration

Read from the project instructions under a `managing-tasks` block:

- Tasks directory — default `.tasks/`
- Archive policy — manual only (no auto-archive). Users run `task archive --older-than <days>` or `task archive --id <id>` explicitly.
- TDD subtask kinds - freeform `kind:` label on subtasks (e.g., `RED`, `GREEN`). Tracker does not enforce.
- Task kinds — freeform `kind:` label on the whole task (e.g., `coding`, `testing`, `docs`, `infra`). A **task-kinds table** in the project instructions maps each value to the skill to invoke and the antipatterns doc to load. The tracker stores the label and nothing else; the agent reads the table (see "Proactive context loading"). Recommended shape:

  ```
  ## Task kinds (managing-tasks)
  | kind    | invoke skill    | load doc                         |
  |---------|-----------------|----------------------------------|
  | coding  | writing-code    | context/ANTIPATTERNS_CODING.md   |
  | testing | testing-code    | context/ANTIPATTERNS_TESTING.md  |
  | docs    | -               | context/STYLE.md                 |
  ```

  Use the project's own vocabulary.

- Task context - `context[]` lists what to read or activate _beyond_ what the task's `kind` resolves to. An entry identical on every task of a layer belongs in the task-kinds table, not on the task. Nothing enforces that split; check it at review.

No config file is required; the CLI works with defaults.

## Proactive context loading

`kind` resolves the layer default; `context[]` carries this task's delta. Load both before touching code:

1. `kind` - look the value up in the project instructions task-kinds table. Invoke the mapped skill and read the mapped doc.
2. `context[]` - read or activate every entry (`kind: file | skill | doc`, `ref`, optional `why`). These are task-specific, so nothing else will supply them.
3. Then start the task.

Skip whichever is absent. A task with neither loads nothing extra.

Run `task show <id>` before starting - it is the only command that emits both fields. `task next` appends ` kind:<domain>` and says nothing about `context[]`, so treat it as a pointer to the task, not the full briefing.

## Auto mode

Working tasks back-to-back without pausing for direction between each one. Opt-in: enter it only when the user asks ("run the tasks", "auto mode", "keep going through the queue"). Then:

1. `task next` (or `task list --ready`) to pick the next actionable task.
2. `task show <id>`, then apply **Proactive context loading** above for that task's `kind` and `context[]`.
3. `task set-status <id> in-progress`, do the work, mark subtasks/`done` as you go.
4. Loop back to step 1 for the next ready task.

Stop the loop and hand back to the user when any of these hits:

- `task next` returns `no ready task` — the queue is drained or everything left is blocked.
- You get stuck: tried multiple approaches on one task with no progress → **Stop, Simplify, Ask** (do not thrash).
- The user interrupts.

Auto mode does **not**:

- Run reviewing-code between tasks. Review is batch-end only, on the user's cadence (plan → break down → run → review), not per-task.
- Self-detect "context running low" and offboard on its own - it cannot measure that reliably. The user watches context and interrupts; that interrupt is the offboard trigger.

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

Every task file: `schema: 1` at top; `uid` (ULID, immutable), `id` (human-readable string), `title`, `status` required. Optional: `kind`, `depends_on`, `depends_on_uids`, `goal`, `files[]`, `tests[]`, `notes[]`, `subtasks[]`, `sources[]`, `context[]`. Filename prefix sets display order; ULID is identity. Full shape, rules and the id/prefix/uid allocation rules for direct writes: `references/file-format.md`.

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
