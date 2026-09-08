# Managing-Tasks Integration

What planning-tasks must get right when it emits tasks. This file holds only the
planning-side editorial standard: what makes a task worth executing.

**The contract itself lives in `../../managing-tasks/references/integration-contract.md`** -
task file shape, the source and context envelope formats, the `id`/prefix/`uid`
allocation rules, the submission loop and its exit-code branches, and lock retry
policy. Read it before writing task files. It is the single source of truth; anything
here that appears to contradict it is stale and the contract wins.

## Per-task quality checklist

Enforce every item before writing task files. If the PRD fails a gate, report the blocking defect to the main agent and wait for a corrected PRD. Fix defects in task files directly.

| Field | Gate |
|---|---|
| `title` | Imperative, specific, one line. |
| `goal` | One sentence. Answers "what capability does this add". |
| `files[]` | ≥1 entry. Each has `path`, `kind`, and ≥1 `changes` bullet. |
| `tests[]` or `notes[]` | At least one populated. Tests named with expected outcome (input → output). `tests[]` is required for a production-code task unless its layer's convention is `tests-after` or `none`. |
| `sources[]` | ≥1 entry. Default `kind: prd`, `ref: <prd-path>#<section>`. |
| `context[]` | Optional. Only what this task needs *beyond* what its `kind` resolves to: `kind` (`file`/`skill`/`doc`), `ref`, one-clause `why`. An entry identical on every task of the layer belongs in the project's task-kinds table, not here. |
| `kind` (task) | Optional but encouraged. Skill-domain (`coding`/`testing`/`docs`/...) from the project instructions task-kinds table. Dominant domain for mixed tasks. Distinct from `subtasks[].kind` (RED/GREEN phase). |
| Granularity | Split if >3 files AND >5 total change bullets. Split per subsystem. |
| Deps | Every `depends_on` reason-backed. No implicit chains. `depends_on_uids` positionally aligned with it. |
| Testing shape | **Blocking.** Scope is decided by `files[]`, not by the task's own assertion. Every production task follows its layer policy below or has a `test-exempt:` note naming a deviation. Silence is not a deviation. |
| Testing convention | Read the project's testing conventions, normally in its project instructions, and apply them per layer. If the project declares none, ask the user before writing the tasks. Do not default silently. |

## Testing policy values

- `tdd`: Put RED and GREEN subtasks in the production task, with RED first.
- `tests-required`: Populate `tests[]` in the production task. Ordering is not fixed.
- `tests-after`: Create a separate test task that depends on the production task.
- `none`: No test task or test entry is required.
- Deviation: Add a `test-exempt:` note that names the policy and reason.

Report the number of production tasks in each policy bucket and list every deviation. A task that matches no policy is a gate failure.

## Drift handling

Tracker and PRD evolve independently. No auto-reparse. If PRD updates invalidate a tracked task:

- Update the task directly: `task edit <id> --goal "..."`, `task add-change <id> <path> "<new change>"`, etc.
- Or, for structural changes: `task rm <id>` + create a new task.
- `sources[].ref` is a human pointer; drift in the ref string does not trigger any tool behavior.

Do not introduce `task sync-prd` or similar reparse commands — out of scope.
