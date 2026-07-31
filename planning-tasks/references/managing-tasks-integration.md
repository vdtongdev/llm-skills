# Managing-Tasks Integration

How `/planning-tasks` emits a batch file and submits it to `/managing-tasks`.

## Batch file format

Path: `.tasks/.import-<feature-slug>.yaml` (leading dot keeps it out of normal `task list` output).

```yaml
schema: 1
tasks:
  - label: ep1
    title: Add get_mtd_summary endpoint
    goal: |
      Expose MTD revenue/expense grouped by currency.
    kind: coding               # optional; skill-domain for proactive context loading
    status: pending
    depends_on: []             # IDs that already exist in the tracker
    depends_on_labels: []      # labels within this batch
    files:
      - path: backend/routers/dashboard.py
        kind: create
        changes:
          - add get_mtd_summary handler
          - wire into router
    tests:
      - "GET /dashboard/mtd-summary returns 200"
      - "Unit: groups transactions by currency"
    notes:
      - "Uses existing Transaction model; no schema change"
    sources:
      - kind: prd
        ref: context/prd-dashboard.md#implementation-details-backend

  - label: ui1
    title: Wire dashboard MTD component
    goal: Frontend consumer for get_mtd_summary.
    depends_on_labels: [ep1]
    files:
      - path: frontend/src/components/dashboard.ts
        kind: modify
        changes:
          - add loadMtdSummary()
          - add mtdRevenueByCurrency computed
    subtasks:
      - id: "2.1"
        kind: RED
        status: pending
        title: failing test for loadMtdSummary
      - id: "2.2"
        kind: GREEN
        status: pending
        title: implement fetch + getters
    sources:
      - kind: prd
        ref: context/prd-dashboard.md#implementation-details-frontend
    context:
      - kind: file
        ref: frontend/src/components/README.md
        why: the store-access convention this component must follow
```

## Per-task quality checklist

Enforce every item before submitting. If any fails, fix the PRD + batch, don't push the work onto the executor.

| Field | Gate |
|---|---|
| `title` | Imperative, specific, one line. |
| `goal` | One sentence. Answers "what capability does this add". |
| `files[]` | ≥1 entry. Each has `path`, `kind`, and ≥1 `changes` bullet. |
| `tests[]` or `notes[]` | At least one populated. Tests named with expected outcome (input → output). `tests[]` is required for a production-code task unless its layer's convention is `tests-after` or `none`. |
| `sources[]` | ≥1 entry. Default `kind: prd`, `ref: <prd-path>#<section>`. |
| `context[]` | Optional. Only what this task needs *beyond* what its `kind` resolves to: `kind` (`file`/`skill`/`doc`), `ref`, one-clause `why`. An entry identical on every task of the layer belongs in the project's task-kinds table, not here. |
| `kind` (task) | Optional but encouraged. Skill-domain (`coding`/`testing`/`docs`/...) from the project's `CLAUDE.md` task-kinds table. Dominant domain for mixed tasks. Distinct from `subtasks[].kind` (RED/GREEN phase). |
| Granularity | Split if >3 files AND >5 total change bullets. Split per subsystem. |
| Deps | Every `depends_on` / `depends_on_labels` reason-backed. No implicit chains. |
| TDD shape | **Blocking.** Scope is decided by `files[]` (does the task write production code?), not by the breakdown's own assertion. Each in-scope task satisfies exactly one of: RED/GREEN subtasks with RED first (`tdd`); a populated `tests[]` (`tests-required`); or a `notes` entry naming a deviation from its layer's declared convention, prefixed `test-exempt:` so it is greppable. Silence is not a deviation. See `SKILL.md` § The TDD gate. |
| Testing convention | Read the project's testing conventions, normally in its `CLAUDE.md`, and apply them per layer. If the project declares none, ask the user before generating the batch. Do not default silently. |

## Source envelope format

Single-string format when emitting via CLI (`task new --source '...'`):

```
kind=prd,ref=context/prd-X.md#section
kind=prd,ref="path/with,comma.md#sec",meta.section_hash=abc
kind=review,ref=abc1234#finding-5
```

- `kind` and `ref` required.
- Quote `ref` with `"..."` if it contains a comma.
- `meta.<key>=<val>` pairs fold into an optional `meta: {}` map.

In batch YAML, just write the structured form (`kind:`, `ref:`, `meta:`) — no quoting logic.

## Label → ID mapping contract

`task import` returns:

```yaml
contract_version: 1
label_map:
  ep1: "7"
  ui1: "8"
created: 2
```

- `label_map` keys: every `label:` from the batch that the producer wants to reference later. Unused labels are still returned; harmless.
- `created`: number of tasks written. If import fails, zero tasks are written (atomic rollback) and no label_map is returned — stderr names the failing entry.
- `contract_version` must equal what this skill asserts against (currently `1`). Mismatch → surface actionable error, do not silently continue.

## Submission loop

1. Write batch to `.tasks/.import-<feature-slug>.yaml`.
2. Run `task import .tasks/.import-<feature-slug>.yaml`.
3. On success: parse `label_map`, delete batch file.
4. On exit 3 (schema): fix the batch, resubmit.
5. On exit 4 (domain: cycle, dep-on-cancelled): resolve the conflict in the PRD, update batch, resubmit.
6. On exit 2 (external dep missing): verify the dep IDs in the PRD, update, resubmit.
7. On exit 5 (lock): retry with 1s/3s/10s backoff; surface to user after 3 retries.

## Drift handling

Tracker and PRD evolve independently. No auto-reparse. If PRD updates invalidate a tracked task:

- Update the task directly: `task edit <id> --goal "..."`, `task add-change <id> <path> "<new change>"`, etc.
- Or, for structural changes: `task rm <id>` + create a new task.
- `sources[].ref` is a human pointer; drift in the ref string does not trigger any tool behavior.

Do not introduce `task sync-prd` or similar reparse commands — out of scope.
