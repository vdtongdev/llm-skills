# Integration Contract

How producer skills emit tasks and parse tracker output. Every machine-consumable output includes top-level `contract_version: 1`.

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

### `task import`

```yaml
contract_version: 1
label_map:
  ep1: "7"
  ep2: "8"
created: 2
```

Producer **must** consume `label_map` to reference newly-created tasks. Labels are batch-local; no cross-batch persistence.

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

## Batch import YAML

Input to `task import <batch.yaml>`.

```yaml
schema: 1
tasks:
  - label: ep1                 # optional; enables intra-batch reference
    title: Add get_mtd_summary endpoint
    goal: |
      Expose MTD revenue/expense grouped by currency.
    kind: coding               # optional; freeform skill-domain label
    status: pending            # optional; defaults to pending
    depends_on: []             # IDs outside this batch
    depends_on_labels: []      # labels within this batch
    files:
      - path: backend/routers/dashboard.py
        kind: create
    tests:
      - "GET /dashboard/mtd-summary returns 200"
    notes: []
    sources:
      - kind: prd
        ref: context/prd-dashboard.md#implementation-details-backend
  - label: ep2
    title: Wire dashboard consumer
    depends_on_labels: [ep1]
    # ...
```

Rules:
- `schema: 1` required.
- `title` required.
- `label` optional but required if any other entry references it via `depends_on_labels`.
- Label uniqueness enforced within batch; duplicate → exit 3.
- Label cycles detected → exit 4.
- `depends_on` entries must reference existing non-cancelled tasks → exit 2 / exit 4.

Atomicity: any failure during write rolls back all written files. Zero tasks created on any validation error.

## Producer-side patterns

### `/planning-tasks` → `task import`

1. Emit batch file at `.tasks/.import-<feature-slug>.yaml`.
2. Show computed dep graph to user.
3. Submit: `task import .tasks/.import-<feature-slug>.yaml`.
4. Consume `label_map` for any downstream references.
5. Delete the batch file on success.

Per-task quality gates enforced by `/planning-tasks` before submit:
- `title`, `goal`, ≥1 `files[]` entry, ≥1 `tests[]` or `notes[]` entry, ≥1 `sources[]` entry.
- `kind` — optional but encouraged; set it to the task's skill-domain (e.g. `coding`, `testing`, `docs`) when the project's `CLAUDE.md` defines a task-kinds table, so the executing agent auto-loads the right skill/antipatterns.
- Split tasks >3 files AND >5 changes bullets.
- Separate tasks per subsystem (backend/frontend/tests/infra).
- TDD RED/GREEN subtask pairs only where TDD is project-mandated and the layer supports it (unit/API/integration/component, not E2E).

### `/reviewing-code` Pass 6 → `task new`

One `task new` command per follow-up finding:

```bash
task new "<finding title>" \
  --goal "<finding summary>" \
  --file <path>:<kind> \
  --source 'kind=review,ref=<branch-sha>#finding-<n>'
```

Emitted as a list of shell commands. User runs them after review.

### `/preserving-session-memory` offboard

Skip if `.tasks/` missing.

- `task list --status done` → "What's Done" section (compact, newest last).
- `task list --status in-progress,pending,blocked` → "Work Checklist".
- Prepend each derived section with:
  `<!-- Generated from task tracker; edit tasks via 'task' CLI, not this file -->`

Tracker is authoritative on task state; SESSION_STATE.md is authoritative on narrative (Failed Approaches, Discussion Summary).

### `/preserving-session-memory` onboard

Skip if `.tasks/` missing.

- `task list --ready` → immediately actionable tasks.
- Cross-reference with SESSION_STATE. If they disagree, tracker is more recent.

## Retry policy on lock contention

Commands exit 5 on lock-acquisition timeout. Producer-side retry:
- Attempt 1: backoff 1s.
- Attempt 2: backoff 3s.
- Attempt 3: backoff 10s.
- After 3 failures: surface error to user.

Maintenance commands (`import`, `renumber`, `archive`, `migrate`, `reindex`) use a 60s lock timeout; treat exit 5 from these as a hard error — retry only once.
