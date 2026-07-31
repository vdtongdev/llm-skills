# Task File Format

Every task is one YAML file at `.tasks/<prefix>-<slug>.yaml`. Archived tasks sit at `.tasks/archived/<prefix>-<slug>.yaml`.

## Full example

```yaml
schema: 1
uid: "01HZABCDEFGHJKMNPQRSTVWXYZ"
id: "7"
title: Wire dashboard MTD component
status: in-progress
kind: coding
depends_on: ["4"]
depends_on_uids: ["01HZ...4..."]
goal: |
  Frontend consumer for get_mtd_summary.
  Renders per-currency breakdown.
files:
  - path: frontend/src/components/dashboard.ts
    kind: modify
    changes:
      - add loadMtdSummary()
      - add mtdRevenueByCurrency computed
tests:
  - "Unit: loadMtdSummary fetches and stores response"
notes:
  - "Pagination not supported upstream; assume single response"
subtasks:
  - id: "7.1"
    status: done
    kind: RED
    title: failing test for loadMtdSummary
  - id: "7.2"
    status: in-progress
    kind: GREEN
    title: implement fetch + getters
sources:
  - kind: prd
    ref: context/prd-dashboard.md#implementation-details-backend
    meta:
      section_hash: "abc123"
```

## Field reference

| Field | Required | Type | Notes |
|---|---|---|---|
| `schema` | yes | int | Always `1` for this version. |
| `uid` | yes | string | ULID. Immutable identity. Generated at create time. Survives rename / renumber / merge. |
| `id` | yes | string | Human-readable. May change on `renumber` or merge-conflict. **Always quote** — bare `7` would parse fine but bare `2.1` parses as float. |
| `title` | yes | string | Imperative one-liner. |
| `status` | yes | string | One of `pending`, `in-progress`, `done`, `blocked`, `cancelled`. |
| `kind` | no | string | Freeform skill-domain label for the whole task (e.g. `coding`, `testing`, `docs`, `infra`). Not enforced, no enum. The consuming project's `CLAUDE.md` maps each value to a skill + antipatterns doc to load before working the task. `kind` carries the *layer default* bundle; anything this one task needs beyond that default goes in `context[]`. Distinct from `subtasks[].kind`, which labels TDD phase (RED/GREEN), not domain. |
| `depends_on` | no | string[] | IDs only. Resolved via `uid` on merge. |
| `depends_on_uids` | no | string[] | Mirror of `depends_on` via ULID. Maintained automatically on write; canonical during merge-conflict resolution. |
| `goal` | no | string | Block scalar (`|`) for multi-line prose. |
| `files` | no | object[] | See below. |
| `tests` | no | string[] | Advisory; not enforced for `done`. |
| `notes` | no | string[] | Append-only in practice (no `rm-note`). |
| `subtasks` | no | object[] | See below. |
| `sources` | no | object[] | See below. |
| `context` | no | object[] | What to read or activate before working this task, *in addition to* whatever `kind` resolves to. See below. |

### `files[]`

```yaml
files:
  - path: string (required)
    kind: create | modify | delete (optional, default modify)
    changes:
      - string (optional; bullets appended via add-change)
```

### `subtasks[]`

Inline only. No nesting.

```yaml
subtasks:
  - id: string (required, e.g. "7.1")
    title: string (required)
    status: pending | in-progress | done | blocked | cancelled
    kind: string (optional; freeform label like RED / GREEN)
```

`subtasks[].kind` labels the *phase* of a subtask (typically TDD RED/GREEN). It is a different axis from the task-level `kind`, which labels the *skill-domain* of the whole task. A task with `kind: coding` can still hold RED/GREEN subtasks — the two never collide because they live at different levels.

If a subtask needs its own `depends_on`, `files`, or `sources`, promote it to a top-level task instead.

### `sources[]`

Multi-provenance. Append-ordered. CLI-addressable via `add-source` / `rm-source`.

```yaml
sources:
  - kind: string (required — e.g. prd, review, issue, manual)
    ref: string (required — human pointer, e.g. file path + section)
    meta:
      <anything>: <anything>
```

`ref` is **not parsed**. It's a human pointer. Drift between ref and source file is user-managed.

### `context[]`

What an executor reads or activates before working this task. Append-ordered. CLI-addressable via `add-context` / `rm-context`. Shape deliberately mirrors `sources[]`.

```yaml
context:
  - kind: file | skill | doc (required)
    ref: string (required - human pointer, e.g. a path or a skill name)
    why: string (optional - one clause, so a reader can decide whether it is worth the read)
```

`kind` is required but not an enum: unrecognised values validate, so new kinds stay additive without a schema bump. Nothing checks the value, so a typo (`files`, `skills`) is a silent documentation defect - it is worth a glance at review time.

`ref` is **not parsed** here either, and nothing existence-checks it. Note that a stale `context[]` ref costs more than a stale `sources[]` ref: the executor proceeds without instructions it was meant to read, rather than merely losing traceability. Keeping refs current is user-managed, same as `sources[]`.

**Division of labour with the task-level `kind`.** `kind` names the layer and resolves the project's default bundle, edited in one place. `context[]` names only what *this* task needs beyond that default. An entry that would be identical on every task of the same layer belongs in the project's `kind` table, not here. Nothing machine-checkable enforces this split; it is a review concern.

## Identity rules

- `uid` is the ground truth of identity.
- `id` is convenient for humans and CLI invocation.
- `id` is unique repo-wide, across `.tasks/` **and** `.tasks/archived/`. Two files claiming one id makes every `depends_on` on it ambiguous; `task verify` reports it as `duplicate-id`.
- On merge conflict (two branches create tasks with identical `id` but different `uid`): keep the earlier-created one's `id` (ULID timestamp order); renumber the later one; rewrite every dependent's `depends_on` from `depends_on_uids`.
- Filename prefix sets display order, not identity. Renames do not affect `uid` or `id`.

## Filename rules

- Top-level tasks: `<prefix>-<slug>.yaml`. Prefix is three digits (e.g., `010`, `020`). Slug is lowercase ASCII, hyphen-separated, ≤60 chars.
- Archived tasks: identical filename under `.tasks/archive/`.
- Prefix gap: 10 between consecutive new tasks. `task move` uses gap-fill; exhausted gaps → `task renumber`.

## Allocating a new file's identity

`task new` allocates all three. A writer creating files directly owes them itself:

| Value | Rule |
|---|---|
| `id` | max existing numeric id across `.tasks/` and `.tasks/archived/`, plus 1. |
| `NNN` prefix | max existing prefix plus 10, zero-padded to 3 digits. Do not pack tightly — the gap is what `task move` consumes. |
| `uid` | from `task get-new-uid --count <n>`. **Never hand-written**: merge-conflict resolution above orders by ULID timestamp, so an invented uid resolves conflicts wrongly and silently. |

Run `task verify` after writing files directly. It is a report, not a repair, and direct writes are not atomic — fix forward from what it names. The producer-side workflow around this (batching, retry, which skill does it when) is `references/integration-contract.md` § Writing task files directly.

## Invalid files

If a file fails to parse or validate:

- `task list` surfaces it as `[?] INVALID  <filename>: <error>` and keeps going; exit 0.
- All other commands touching that file exit 1 with the same error.
- `task reindex` rebuilds the cache; malformed files stay visible as INVALID rows, do not block others.

## Hand-editing

Safe to hand-edit. Tracker revalidates on every write; a broken file will be caught the next time `list` is run.

**Exception: `depends_on` and `depends_on_uids` must be edited together.** Nothing recomputes the mirror from a hand edit, and merge-conflict resolution rewrites `depends_on` *from* `depends_on_uids` (§ Identity rules) — so a hand-edited `depends_on` with a stale mirror is silently reverted at the next merge. Prefer `task add-dep` / `task rm-dep`, which maintain both. Editing them by hand means editing both, positionally aligned.

After hand-editing multiple files, run `task reindex` to refresh `.tasks/.cache/index.yaml`, and `task verify` to catch dangling deps, cycles and duplicate ids.
