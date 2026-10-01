# Integration Contract

How producer skills emit tasks and parse tracker output. Every machine-consumable output includes top-level `contract_version: 1`.

**This file is the single source of truth for the producer contract.** Producer skills
(planning-tasks, reviewing-code, journaling-session-memory) read it rather than
keeping their own copy of these shapes; their own reference files carry only skill-specific
editorial standards. A shape described in two places drifts in one of them.

## Contract versioning

- Consumers assert the exact `contract_version` they support.
- Mismatch → skill surfaces an actionable error. Never silently continue.
- Bumped on breaking changes only: field rename, field removal, semantic shift.
- Additive fields (new optional output keys) do not bump.

Current: `contract_version: 1`.

## Per-command output shapes

### `task new`

```yaml
contract_version: 1
id: "7"           # allocated
uid: "01HZ..."    # allocated ULID
file: "070-wire-dashboard.yaml"
```

### `task get-new-uid [--count <n>]`

```yaml
contract_version: 1
uids:
  - "01HZ..."
  - "01HZ..."
```

### `task verify`

```yaml
contract_version: 1
ok: false
checked: 12
problems:
  - kind: dangling-dep
    id: "7"
    file: "070-wire-dashboard.yaml"
    ref: "99"
```

Exit 0 when `problems` is empty, exit 4 otherwise. Problem kinds: `invalid`, `duplicate-id`, `dangling-dep`, `cycle`. Full field-by-kind table: `cli-reference.md` § `task verify`.

### `task show <id>` / `task why <id>`

`show` emits the full task as YAML with `contract_version`. `why` emits human-readable text (title + goal + sources).

### Mutation commands

Every mutation emits at minimum:

```yaml
contract_version: 1
id: "<affected-id>"
```

Plus the mutated field (e.g., `status: done`, `added: "<dep-id>"`, `moved_to: "<new-filename>"`).

### Query commands (list, next, deps, grep)

Human-oriented. Multi-line text, not YAML. Parse line-by-line if needed:

- `[<id>] <STATUS>  <title>` — header line for each task
- `    <summary>` — continuation
- `[?] INVALID  <filename>: <error>` — malformed file marker

## Writing task files directly

Producers create tasks by writing one `.tasks/NNN-<slug>.yaml` file per task. There is no batch format and no label indirection: a `depends_on` entry is the real id of a task that already exists or that this run is creating.

```yaml
schema: 1
uid: "01HZ..."               # from `task get-new-uid`, never invented
id: "7"
title: Add get_mtd_summary endpoint
status: pending
kind: coding                 # optional; freeform skill-domain label
goal: |
  Expose MTD revenue/expense grouped by currency.
depends_on: ["6"]
depends_on_uids: ["01HY..."] # the uid of each depends_on entry, same order
files:
  - path: backend/routers/dashboard.py
    kind: create
tests:
  - "GET /dashboard/mtd-summary returns 200"
notes: []
sources:
  - kind: plan
    ref: context/plans/dashboard.md#steps
context:                     # optional; what to read BEYOND the kind default
  - kind: file
    ref: backend/services/currency.py
    why: the rounding rule this endpoint must reuse
  - kind: skill
    ref: testing-code
```

### Allocation rules

Nothing allocates for you on this path, so the producer owes `id`, the `NNN` filename prefix and `uid` itself. The rules for all three, plus the slug rule, are `file-format.md` § Allocating a new file's identity — read them there, they are on-disk invariants rather than producer policy.

Producer-side consequence: call `task get-new-uid --count <n>` **once** for the whole run and deal out the uids, and compute `id`/`NNN` from the max across files already on disk *plus* the ones this run has written. A run that recomputes per task without counting its own writes emits duplicates.

`depends_on_uids` mirrors `depends_on` positionally. Keep them aligned; a stale mirror is what the merge procedure rewrites from.

### Rules

- `schema: 1`, `uid`, `id`, `title` and `status` required → exit 3 on a read of a file missing any.
- `depends_on` entries must reference existing non-cancelled tasks.
- `context[]` entries need `kind` and `ref` as strings; `why` optional. Unrecognised `kind` values pass the schema.

**Not atomic.** A run that fails partway leaves the files it already wrote. Run `task verify` afterwards and fix forward from what it reports; there is no rollback.

## Source and context envelope format

Single-string format, used by `task new --source`, `task new --context`, and `task add-source`:

```
kind=plan,ref=context/plans/X.md#section
kind=plan,ref="path/with,comma.md#sec",meta.section_hash=abc
kind=review,ref=abc1234#finding-5
```

- `kind` and `ref` required.
- Quote `ref` with `"..."` if it contains a comma.
- `--source` folds `meta.<key>=<val>` pairs into an optional `meta: {}` map. `--context` accepts `kind`, `ref` and `why` only; any other key is exit 3, since a stray key there silently loses required reading.
- `task add-context` uses discrete flags (`--kind`, `--ref`, `--why`) rather than this envelope, because it has no `meta` to fold.

In a task file, write the structured form (`kind:`, `ref:`, `meta:`) - no quoting logic.

## Producer-side patterns

### planning-tasks → task files + `task verify`

1. Get uids: `task get-new-uid --count <number-of-tasks>`.
2. Write one `.tasks/NNN-<slug>.yaml` per task, per § Writing task files directly.
3. Show the computed dep graph to the user, plus a TDD compliance summary so a cheap exemption is conspicuous rather than buried.
4. Run `task verify`.
5. On exit 0: planning is done.
6. On exit 4: read `problems[]`, fix the files it names, re-run. `invalid` → the file breaks the schema; `duplicate-id` → two files claim one id; `dangling-dep` → a `depends_on` names no task; `cycle` → the dep graph loops.
7. On exit 5 (lock): retry per the backoff below; surface to the user after 3 retries.

Verify is a report, not a repair, and the writes were not atomic - fix forward from what it says rather than expecting a rollback.

The per-task quality gates a task must satisfy before it is written (title, goal, granularity, the blocking TDD gate) are planning-tasks' editorial standard, not this contract. They live in `../../planning-tasks/references/managing-tasks-integration.md`.

### reviewing-code Pass 6 → `task new`

One `task new` command per follow-up finding:

```bash
task new "<finding title>" \
  --goal "<finding summary>" \
  --file <path>:<kind> \
  --source 'kind=review,ref=<branch-sha>#finding-<n>'
```

Emitted as a list of shell commands. User runs them after review.

### journaling-session-memory offboard

Skip if `.tasks/` missing.

- `task list --status done` → the capsule's "What's Done" section (compact, newest last).
- `task list --status in-progress,pending,blocked` → the capsule's "Work Checklist".
- Task-scoped findings (a failed approach, a constraint discovered while working the task) go to `task add-note <id>` at the moment they are learned, not into the capsule. They expire with the task, which is the point.

Tracker is authoritative on task state; the session journal is authoritative on narrative.

### journaling-session-memory onboard

Skip if `.tasks/` missing.

- `task show <id>` for each id in the latest session file's `tasks:` frontmatter - notes carry the task-scoped context.
- `task list --ready` → immediately actionable tasks.
- Cross-reference with the handoff capsule. If they disagree, the tracker is more recent on task state.

## Retry policy on lock contention

Commands exit 5 on lock-acquisition timeout. Producer-side retry:
- Attempt 1: backoff 1s.
- Attempt 2: backoff 3s.
- Attempt 3: backoff 10s.
- After 3 failures: surface error to user.

Maintenance commands (`renumber`, `archive`, `migrate`, `reindex`) use a 60s lock timeout; treat exit 5 from these as a hard error — retry only once.
