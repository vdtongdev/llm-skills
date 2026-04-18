# CLI Reference

Every command runs under a project root (cwd); `.tasks/` is the state directory. Output is YAML on stdout unless noted. Exit codes: see `exit-codes.md`.

## Global

- `task -v | --version` — print `managing-tasks <version>`, exit 0.
- `task -h | --help` — print help, exit 0.
- Unknown command → exit 3.

## Bootstrap

### `task init`

Idempotent setup.

- Creates `.tasks/`, `.tasks/.cache/`.
- Appends `.tasks/.cache/` to `.gitignore` if absent (checks exact-line match, whitespace-trimmed).
- Rebuilds cache.

Output: `{contract_version: 1, ok: true, tasks_dir: ".tasks"}`.

Every mutation auto-creates `.tasks/` — running `init` first is optional but recommended.

## Create

### `task new "<title>" [flags]`

Creates one task.

Flags:
- `--goal "<text>"` — block prose (single line OK; multi-line OK via shell escaping).
- `--file <path>:<kind>` — repeatable. `kind` ∈ {`create`, `modify`, `delete`}; omitted kind defaults to `modify`.
- `--depends-on <id>` — repeatable. ID must exist and must not be cancelled (exit 2 / exit 4).
- `--source '<kind=..,ref=..,meta.X=..>'` — repeatable. Single-string format; quote `ref` value with `"..."` if it contains a comma. `kind` and `ref` required; arbitrary `meta.<key>=<val>` pairs folded into `meta: {}`.

Allocates: next numeric `id` (max existing + 1), new ULID `uid`, next filename prefix (10-gap).

Output: `{contract_version: 1, id, uid, file}`.

### `task import <batch.yaml>`

Atomic batch create. See `integration-contract.md` § Batch import for the YAML shape.

Semantics:
1. Parse + schema-validate batch (exit 3 on malformed; exit 4 on label cycle).
2. Acquire lock (60s timeout — maintenance tier).
3. Verify external `depends_on` IDs exist and are not cancelled (exit 2 / exit 4).
4. Allocate sequential IDs + ULIDs + prefixes.
5. Resolve `depends_on_labels` → resolved IDs. Unknown label → exit 3.
6. Stage all writes; atomically write each. Any write failure → roll back all written files.
7. Rebuild cache.

Output: `{contract_version: 1, label_map: {<label>: <id>}, created: <n>}`.

## Query

All query commands serialize against mutations via the project lock (5s timeout).

### `task list [flags]`

Default: excludes `done` and `cancelled`; includes `pending`, `in-progress`, `blocked`, and `invalid` rows. 4-line format per task; compact: 1-line.

Flags:
- `--compact` — 1-line: `[<id>] <STATUS>  <title> (deps: <ids>)`.
- `--all` — include `done` and `cancelled`.
- `--archived` — include archived tasks.
- `--status <s>` — comma-separated statuses; overrides default filter.
- `--touching <path-substring>` — filter to tasks with any `files[].path` matching.
- `--ready` — only `pending` tasks whose every dep is terminal (`done` or `cancelled`).
- `--blocked` — status=`blocked` OR has any non-terminal dep.

Output: multi-line text, **not** YAML. Invalid files render `[?] INVALID  <filename>: <error>` inline; other tasks unaffected.

### `task show <id>`

Full detail for one task. `<id>` may be top-level (`7`) or subtask (`7.2`). Archived tasks included.

Output: YAML with `contract_version`, all task fields, `archived: bool`.

### `task next`

If any `in-progress` task has pending subtasks, returns the first pending subtask.
Otherwise returns the first `pending` task with all deps terminal.
Otherwise `no ready task`.

Output: single line (not YAML).

### `task deps <id>`

Bidirectional tree: what `<id>` depends on, what depends on `<id>`.

Output: multi-line text.

### `task grep <pattern>`

Case-insensitive regex against title, goal, notes, file paths, source refs.

Output: compact list.

### `task why <id>`

Title + goal + source list for `<id>`.

Output: multi-line text.

## Mutate

All mutations acquire the exclusive lock (5s timeout); validate post-mutation via `validateTaskFile`; rewrite the task file atomically; rebuild cache.

### `task set-status <id> <status> [--force]`

`<status>` ∈ `pending | in-progress | done | blocked | cancelled`.

Guards when `<status>` = `done` (skip with `--force`):
- Any subtask not in {`done`, `cancelled`} → exit 4.
- Any `depends_on` target not in {`done`, `cancelled`} → exit 4.

### `task edit <id> [--title <t>] [--goal <g>]`

Overwrites title and/or goal.

### File changes

- `task add-file <id> <path:kind>` — appends to `files[]`.
- `task rm-file <id> <path>` — removes by path match.
- `task add-change <id> <path> <change-text...>` — appends to `files[].changes[]` of the matching file (exit 2 if path not on task).

### Dependencies

- `task add-dep <id> <dep>` — guards:
  - `<dep>` exists (exit 2).
  - `<dep>` not cancelled, not archived (exit 4).
  - No self-dep (exit 4).
  - No cycle introduced (exit 4).
  - If `<id>` is `done` and `<dep>` is non-terminal → exit 4 (reopen first).
- `task rm-dep <id> <dep>` — removes by match. Silent no-op if absent.

### Subtasks

- `task add-subtask <id> <sub-id> <title...> [--kind <k>]` — appends with `status: pending`.
- `task edit-subtask <id> <sub-id> [--status <s>] [--title <t>]` — exit 2 if sub not found.

### Prose

- `task add-note <id> <text...>` — appends to `notes[]`.
- `task add-test <id> <text...>` — appends to `tests[]`.

### Sources

- `task add-source <id> --source '<kind=..,ref=..>'` — same format as `task new --source`.
- `task rm-source <id> <ref>` — removes entries matching `ref`.

### Ordering

- `task move <id> --after <other>` — places `<id>` one prefix after `<other>`. If next adjacent prefix is within 1 of `<other>.prefix`, exit 4 with message `no prefix gap between X and Y; run 'task renumber'`.

### Removal / cancellation

- `task rm <id> [--force]` — delete file. Exit 4 if any task depends on `<id>` and `--force` absent.
- `task cancel <id> [--force]` — sets status=cancelled. Exit 4 if any active dependent exists and `--force` absent.
- `task reopen <id>` — sets status=pending (no guards).

## Lifecycle

All lifecycle commands use the 60s maintenance timeout.

### `task archive --id <id> | --older-than <days>`

Moves file(s) to `.tasks/archived/`. Refuses (exit 4) any target referenced by an active (non-terminal) task's `depends_on`.

`--older-than <days>`: selects `done` tasks with `mtime < now - days*86400s`.

Output: `{contract_version: 1, archived: [<ids>]}`.

### `task reindex`

Scans `.tasks/` and `.tasks/archived/`, rebuilds `.tasks/.cache/index.yaml`.

Output: `{contract_version: 1, indexed: <count>}`.

### `task renumber`

Rewrites every non-archived task's filename prefix to clean 10-gap increments in current display order. Cache rebuilt. No content changes.

Output: `{contract_version: 1, renamed: <count>, mapping: {<old-filename>: <new-filename>}}`.

### `task migrate [--dry-run]`

Reads all files; identifies those with `schema: <prior-version>`; migrates to current. `--dry-run` prints plan only.

v1 is current; no prior version exists. Always returns `migrated: 0` until v2 ships.
