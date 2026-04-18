# Task File Format

Every task is one YAML file at `.tasks/<prefix>-<slug>.yaml`. Archived tasks sit at `.tasks/archived/<prefix>-<slug>.yaml`.

## Full example

```yaml
schema: 1
uid: "01HZABCDEFGHJKMNPQRSTVWXYZ"
id: "7"
title: Wire dashboard MTD component
status: in-progress
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
| `depends_on` | no | string[] | IDs only. Resolved via `uid` on merge. |
| `depends_on_uids` | no | string[] | Mirror of `depends_on` via ULID. Maintained automatically on write; canonical during merge-conflict resolution. |
| `goal` | no | string | Block scalar (`|`) for multi-line prose. |
| `files` | no | object[] | See below. |
| `tests` | no | string[] | Advisory; not enforced for `done`. |
| `notes` | no | string[] | Append-only in practice (no `rm-note`). |
| `subtasks` | no | object[] | See below. |
| `sources` | no | object[] | See below. |

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

## Identity rules

- `uid` is the ground truth of identity.
- `id` is convenient for humans and CLI invocation.
- On merge conflict (two branches create tasks with identical `id` but different `uid`): keep the earlier-created one's `id`; renumber the later one; rewrite every dependent's `depends_on` from `depends_on_uids`.
- Filename prefix sets display order, not identity. Renames do not affect `uid` or `id`.

## Filename rules

- Top-level tasks: `<prefix>-<slug>.yaml`. Prefix is three digits (e.g., `010`, `020`). Slug is lowercase ASCII, hyphen-separated, ≤60 chars.
- Archived tasks: identical filename under `.tasks/archive/`.
- Prefix gap: 10 between consecutive new tasks. `task move` uses gap-fill; exhausted gaps → `task renumber`.

## Invalid files

If a file fails to parse or validate:

- `task list` surfaces it as `[?] INVALID  <filename>: <error>` and keeps going; exit 0.
- All other commands touching that file exit 1 with the same error.
- `task reindex` rebuilds the cache; malformed files stay visible as INVALID rows, do not block others.

## Hand-editing

Safe to hand-edit. Tracker revalidates on every write; a broken file will be caught the next time `list` is run.

After hand-editing multiple files, run `task reindex` to refresh `.tasks/.cache/index.yaml`.
