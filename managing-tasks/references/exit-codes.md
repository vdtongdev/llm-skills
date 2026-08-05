# Exit Codes

Canonical contract. Every command respects this table. Tests assert against it.

| Code | Class | Meaning | Examples |
|---|---|---|---|
| `0` | success | Command succeeded. May emit `warnings: [...]` in output. | any ok path |
| `1` | internal | Crash, unexpected IO failure, or malformed task file hit outside `list` | ENOENT on state dir, JSON/YAML parser crash outside list path |
| `2` | not-found | ID, path, or external dep target missing | `task show nonexistent`, `task add-dep 7 999`, `task rm-context` on an absent ref |
| `3` | bad-input | Bad CLI args, or a schema violation reached through a command's own input (missing required field, wrong type, float ID) | `task new` without title, unknown status name, `task get-new-uid --count 0` |
| `4` | domain-violation | Constraint violation at the domain level | cycle, self-dep, done-with-open-subtasks, dep-on-cancelled, prefix-gap-exhausted, cancel-with-active-dependents, archive-of-referenced-task, retroactive-done-invalidation, any `task verify` problem |
| `5` | lock | Lock acquisition timeout | contention > 5s (short) or > 60s (maintenance) |
| `6` | schema-unsupported | Task file schema version outside supported range | file with `schema: 2` and CLI only supports 1; points user to `task migrate` |

## Classification rules

- **"Not found" vs "bad-input"**: missing reference to an existing resource → 2. Malformed input that never resolves to a lookup → 3.
- **"Bad-input" vs "domain"**: schema/syntax violation → 3. Valid input that violates a rule → 4.
  - Example: `task new --depends-on 7` with `id: 7` cancelled → 4 (input well-formed, semantics violated).
- **"Internal" is a last resort**: exit 1 means the CLI bugged out or the environment failed. Domain errors never fall back to 1.

## Per-command notes

### `task list`

Unique behavior: tolerates malformed files per-row. A malformed task surfaces as `[?] INVALID  <filename>: <error>`; overall exit is still 0. Every other command hitting a malformed file exits 1.

### `task verify`

Exit 4 means the repo has problems, not that the invocation was wrong. A schema-invalid file is reported here as exit 4 even though the same violation from `task new` is exit 3: the code classifies the verdict, and the caller passed no input to get wrong.

### `task archive`

Attempting to archive a task referenced by an active (non-terminal) dep is a **hard error (exit 4)**, not a warning. No silent skip.

### `task set-status done`

- Open subtask → exit 4.
- Open `depends_on` → exit 4.
- Override with `--force` → exit 0.

### `task add-dep`

- Dep does not exist → exit 2.
- Dep is cancelled or archived → exit 4.
- Self-dep → exit 4.
- Cycle → exit 4.
- Current task is `done` and new dep is non-terminal → exit 4 (reopen first).

### `task cancel`

- Active dependents exist and `--force` absent → exit 4.
- With `--force`: exit 0; dependents left unchanged (must be handled manually).

### `task rm`

- Dependents exist and `--force` absent → exit 4.
- `--force` removes the file; dependents' `depends_on` entries now point to a missing ID (surfaces as `(missing)` in `task deps`).

### `task move`

- Anchor not found → exit 2.
- No prefix gap between anchor and next task → exit 4 with message pointing to `task renumber`.

### `task migrate`

- Task file has unsupported schema on read by any other command → exit 6. Points user to run `task migrate`.
- `task migrate` itself returns 0 even when no files need migration.

## Stderr vs stdout discipline

- YAML structured output → stdout.
- Human error context → stderr.
- Consumers must not parse stderr. Exit code + stdout YAML is the machine contract.
