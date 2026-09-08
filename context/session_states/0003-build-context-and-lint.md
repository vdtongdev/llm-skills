---
id: 0003
slug: build-context-and-lint
started: 2026-07-31
finalized: true
branch: master
head: 5ccf27c
tasks: []
topics: [managing-tasks, planning-tasks]
---

# Session 0003 - build-context-and-lint

## Milestones

- done: onboarded from 0002. Clean shutdown confirmed - `finalized: true`, HEAD still `5ccf27c`, git status matched the capsule exactly. No drift, no stash, no recovery
- decision: USER RULED - build the spec (capsule next-steps 1 and 2), SKIP 5b round 2 on R4b. Commit only once the skill is fully updated and verified ready to use. `context/` goes into `.gitignore`

- done: step 1 - `lib/schema.mjs`: `CONTEXT_KINDS`, `TEST_POLICIES`, exported `validateContext`, wired into both `validateTaskFile` and `validateBatch`
- decision: the spec's two old-CLI compat tests are unrunnable as written once the change lands (there is no pre-change validator left to run them against). Implemented as tests of the underlying PROPERTY instead: validator ignores unknown top-level keys; mutation round-trip preserves them; `import` drops them. Same evidence, still meaningful after the change
- done: steps 2-4 - `cmdAddContext`/`cmdRmContext` in `mutate.mjs`, `--context` envelope + import whitelist in `create.mjs`, `context` projected in `cache.mjs` scanTasks, rendered by `formatters.mjs`
- decision: DEVIATED from spec R2's `task show` rendering. The spec asked for a human `Context:` block, one line per entry. `renderShow` emits YAML and `exit-codes.md` § Stderr vs stdout calls "exit code + stdout YAML" the machine contract, so a non-YAML block inside it would break parsing. Rendered as a YAML `context:` key instead. NOT yet raised with the user
- done: step 5 - `lib/commands/lint.mjs`. Policy load/validate, own `globToRegExp` (no glob dep in the tree), two-stage resolution, checks, `context[]` existence warnings, summary formatter. Exports `checkTasks` so import reuses it
- done: step 5b - `enforcePolicy()` in `create.mjs` at the `validateBatch` call site, before `withLock`. Violations exit 4 with zero files written; deviations import but print; `--skip-policy-check` names every task it lets through

- done: step 6 docs - `file-format.md` (`context[]` row + subsection + narrowed `kind`), `cli-reference.md` (new § Policy, `--context`, add/rm-context, import semantics 1b), `exit-codes.md` (code 7 + 4-vs-7 classification rule + per-command notes), `integration-contract.md`, `SKILL.md` (§ Policy enforcement, decision graph, amended `:48`), `MAINTENANCE.md` (routing row + methodology-vs-installed-policy rule)
- self-found: `planning-tasks/SKILL.md` gate option (c) said only "a `notes` entry naming the deviation and why", but `lint` matches on the literal `test-exempt:` prefix. The emitter would have written deviations the checker reads as silence, failing its own batches. Fixed in both SKILL.md and `managing-tasks-integration.md`, with the prefix called out as load-bearing
- done: step 7 - R5 in `planning-tasks/SKILL.md` (§ 6 `context` gate, lint-before-import with exit-code handling, never `--skip-policy-check`, policy.yaml vs CLAUDE.md table must agree) and `references/managing-tasks-integration.md` (batch example, checklist row, submission loop)
- note: 68/68 tests green (26 pre-existing + 42 new in `tests/policy.mjs`). The pre-existing `storage: concurrent lock serialized` test is FLAKY, ~1 run in 5, both before and after this change. `git diff` confirms `lib/storage.mjs` is untouched this session
- done: end-to-end smoke run against a real temp project - the docs-file-does-not-demote-a-backend-task case, warnings, exit 4 with zero files written, then exit 0 after RED/GREEN added, `context[]` round-tripping through import into `task show`
- done: stripped the em dashes I had introduced in added doc lines, per C-01. Pre-existing ones left alone

## Corrections

None.

## Handoff Capsule

### Status

implementing - the spec is built and green, but it has had no review pass and nothing is committed

### What's Done

- `managing-tasks/lib/schema.mjs`: `CONTEXT_KINDS`, `TEST_POLICIES`, `validateContext`, wired into task + batch validation
- `managing-tasks/lib/commands/lint.mjs`: NEW. Policy loading/validation, glob matching, two-stage resolution, checks, warnings, summary, `cmdLint`
- `managing-tasks/lib/commands/create.mjs`: `parseContextString`, `--context` on `task new`, `context` in the import whitelist, `enforcePolicy()` (R4b) + `--skip-policy-check`
- `managing-tasks/lib/commands/mutate.mjs`: `cmdAddContext`, `cmdRmContext`
- `managing-tasks/lib/cli.mjs`: dispatch for `lint`, `add-context`, `rm-context`; help text; exit 7
- `managing-tasks/lib/cache.mjs`: `context` in the scanTasks projection (index shape unchanged)
- `managing-tasks/lib/formatters.mjs`: `context` in `renderShow`
- `managing-tasks/tests/policy.mjs`: NEW, 42 tests covering the spec's Test Plan
- `managing-tasks/{SKILL,MAINTENANCE}.md` + all four `references/*.md`: step 6 doc pass
- `planning-tasks/SKILL.md`, `planning-tasks/references/managing-tasks-integration.md`: R5, plus the `test-exempt:` prefix fix
- `.gitignore`: `context/` added

### Work Checklist

- [-] review before commit: NOT done. The user's global CLAUDE.md requires an adversarial code review agent before finalizing, and this session wrote ~600 lines of new code and docs with no second pair of eyes. I did a self-check only (traced glob semantics, rank ordering, the mutate/save round-trip, exit-code paths)
- [ ] user decision on the `task show` deviation above - accept the YAML `context:` key, or add a separate human-rendered block somewhere that is not the machine contract
- [ ] commit. User's instruction: only after the skill is confirmed ready to use. Nothing from sessions 0001, 0002 or 0003 is committed
- [ ] `prd-enrolment-schedule-attendance.md` at the repo root: example material, agreed in 0002 to be deleted when this work ends

### What's Next

1. Run the adversarial code review agent over the diff (per global CLAUDE.md). Highest-value targets: `lint.mjs` glob + two-stage resolution, `enforcePolicy` ordering vs the lock, and whether the docs now contradict each other anywhere.
2. Settle the `task show` deviation with the user.
3. Commit. Suggested split follows the spec's Execution Order: schema+CLI+lint code, then docs, then `planning-tasks`. One commit is also defensible since none of it has ever been committed.
4. Optional and previously declined: 5b round 2 on R4b.

### Failed Approaches

No task tracker in this repo, so these live here.

- **Reading the spec's old-CLI compat tests literally.** "Task file written by the new CLI, validated by the old one" cannot run in a repo where the old validator no longer exists. Root cause: the spec wrote the test as a procedure over two CLI versions rather than as the property it was evidence for. Replaced with property tests (unknown keys validate / survive mutation / are dropped by import), which is the same evidence and still runs.
- **`grep -Fxn "$line"` in a shell loop to locate lines beginning with `-`.** ugrep parses the leading dash as an option and errors. Fixed with `grep -Fxn -e "$line"`. Cheap, but it silently half-completed the first pass, so the em-dash cleanup had to be re-run and re-verified.
- **Running `git status`/`git stash push` with a relative pathspec from inside `managing-tasks/`.** The pathspec resolves against cwd, so `-- managing-tasks` meant `managing-tasks/managing-tasks` and reported no changes - which briefly looked like "my edits are missing". Always run repo-wide git queries from the repo root.

### Open Questions (session-scoped)

- The `task show` deviation from spec R2 (YAML `context:` key vs the specified human `Context:` block). My reasoning is that `references/exit-codes.md` names stdout YAML as the machine contract, but the user has not ruled on it.
- Whether to commit as one commit or split along the spec's Execution Order.
- Q-04 and Q-05 from 0002 are still open and were not raised this session.

### Uncommitted Changes

Everything, across three sessions. `git status` at repo root: 19 modified (13 in `managing-tasks`, 4 in `planning-tasks`, `writing-llm-document/references/style-guide.md`, `.gitignore`), plus untracked `managing-tasks/lib/commands/lint.mjs`, `managing-tasks/tests/policy.mjs`, and `prd-enrolment-schedule-attendance.md`. `context/` is now gitignored, so the journal itself is untracked by design. No stash.

### Docs That Will Need Reading

- `context/prd-task-context-and-lint.md` - the spec this implements; needed to judge whether the build is faithful
- `managing-tasks/references/exit-codes.md` - the canonical contract; it constrained both the new code 7 and the `task show` deviation
- `/writing-llm-document` - before editing any further skill prose
- `/reviewing-code` - for the review pass that has not happened yet

### Docs That May Need Updating

- None known. The step 6 doc pass was written alongside the code, and `managing-tasks/SKILL.md:48` plus `MAINTENANCE.md` § Classification Rules were amended in the same session that made them wrong. A reviewer should still check that claim rather than trust it.

### Retrieval Hints

- grep terms: `policy-deviation`, `--skip-policy-check`, `enforcePolicy`, `checkTasks`, `resolveTaskPolicy`, `globToRegExp`, `test-exempt:`, `CONTEXT_KINDS`, `TEST_POLICIES`
- the single checker both `lint` and `import` call: `managing-tasks/lib/commands/lint.mjs` `checkTasks()`
- the import-side call site: `managing-tasks/lib/commands/create.mjs`, `enforcePolicy()` invoked right after `validateBatch(batch)`
- codex session `019fb21a-1b5b-7640-ba7e-37f2c025b552` still holds the 5b round-1 findings on this spec
