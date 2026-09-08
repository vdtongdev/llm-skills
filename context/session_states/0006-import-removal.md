---
id: 0006
slug: import-removal
started: 2026-07-31
finalized: true
branch: master
head: a261f34
tasks: []
topics: [managing-tasks, testing, planning-tasks]
---

# Session 0006 - import-removal

## Milestones

- done: onboarded from 0005. Clean shutdown - `finalized: true`, HEAD still `a261f34`, six dirty doc files match the capsule exactly. No stash, no `.tasks/` in this repo, COMMON.md under budget
- note: raised the two deferred doc items (README.md, file-format.md:145) and Q-07 with the user; he said "go" without ruling. Treating both as still deferred - README folds into step 5's doc pass, Q-07 stays as-is

- note: RED for step 1 caught a vacuous-green trap. The three `--count` validation tests passed on the first RED run because `unknown command` ALSO exits 3 - the assertion `code === 3` was satisfied by the verb not existing. Added `assert.doesNotMatch(out, /unknown command/)` to each; all 7 then failed for the right reason. This is exactly what "observe the failure message, not just non-zero" is for
- done: STEP 1 GREEN. `task get-new-uid [--count n]` - `cmdGetNewUid` (`create.mjs:58-74`), router + help in `cli.mjs`, 7 tests in new `tests/uid.mjs`. Reads and writes no state, so no lock and no `.tasks/` required. Returns `{contract_version, uids}` sorted ascending. Bare `--count` (parses to boolean `true`) is rejected as a missing value, not silently treated as 1. Suite 49/49

- note: same vacuous-green trap in step 2, different shape - "verify does not modify task files" passed at RED because a nonexistent verb modifies nothing. Fixed by asserting `code === 4` first (verify must have RUN and found the problem) before comparing file bytes. Pattern to watch: any test whose assertion is about ABSENCE passes trivially when the feature is absent
- decision: USER RULED - the integrity verb is named `verify`
- done: STEP 2 GREEN. `task verify` - `cmdVerify` (`lifecycle.mjs`), 11 tests in `tests/verify.mjs`. Reports `invalid` / `dangling-dep` / `cycle`, every problem in one run. `hasCycle` exported from `mutate.mjs` and run per node for the repo-wide walk; a helper `reaches()` groups each cycle so one cycle is one problem, not one per member. Archived tasks resolve dep targets but are not walked. No lock taken - it only reads
- decision: exit code channel. `verify` must print stdout YAML AND exit 4, but `main()` hard-coded `return 0` for any handler result and the catch path prints to stderr. Added `EXIT = Symbol.for("managing-tasks.exit")` (`schema.mjs`), read as `res?.[EXIT] ?? 0`. A symbol because YAML.stringify ignores symbol keys, so the code cannot leak into the machine-parsed stdout (C-10). Any problem is exit 4, not 3: the verdict is about the REPO, not about argv
- done: `tests/helpers.mjs` created early (scratch/runCLI/seed/seedRaw) because verify's fixtures need to write deliberately-invalid files, which no CLI path will produce. This is step 3's `seed()` landing one step ahead of schedule
- note: suite 61 green, 3 consecutive runs, no lock flake

- done: STEP 3 GREEN, and the riskiest step turned out cheap. All 11 fixture-uses of `import` in `test.mjs` migrated to `seed()` with ZERO assertion changes - no test needed weakening, so `seed()` reproduces what `import` produced. Suite still 61, twice
- note: the 17-fixture count from 0005 was 11 fixture-uses + 6 tests that assert about `import` itself. Only the 11 were step 3's business. The 6 remaining (`test.mjs:151,188`, three in `context.mjs`) die with the verb in step 5, EXCEPT the `context[]`-to-disk and `kind`-to-disk round-trips, whose property must be re-expressed as seed + show rather than deleted

- done: STEP 4 (prose, no gate). `/planning-tasks` Step 6 now writes task files directly: `SKILL.md:172` and the § Task file format block rewritten, `get-new-uid` and the blocking `task verify` gate added, all `batch`/`label_map` wording removed from `SKILL.md` and `references/managing-tasks-integration.md`
- note: deleting the `validateBatch` label-collision test exposed a REAL gap. `import` allocated every id itself, so nothing ever checked id uniqueness; with direct writes two files can claim one id and every `depends_on` on it goes ambiguous. Added `duplicate-id` to `verify` (RED first, 12 verify tests now). The lesson: when deleting a test, ask what invariant it was buying, not just whether its subject still exists
- done: STEP 5 CODE COMPLETE. Deleted `cmdImport` (`create.mjs`), `validateBatch` + `detectLabelCycles` (`schema.mjs`), the router entry, help line, and the batch tests. `create.mjs` imports trimmed (`readFile`, `resolve`, `MAINTENANCE_TIMEOUT_MS`, `TERMINAL` all now unused). Suite 60 green, 3 consecutive runs, `bin/task --help` smoke-tested
- done: STEP 5 DOC PASS, PARTIAL. Rewrote `cli-reference.md` (import section -> `get-new-uid` + a full `task verify` entry with the problem-kind table), `exit-codes.md` (import rows out, `verify` note in), `SKILL.md` (description trigger, decision graph, quick reference, integration shapes), `integration-contract.md` (§ Batch import YAML -> § Writing task files directly, with the allocation rules; § Producer-side patterns rewritten around verify)
- note: STOPPED MID-DOC-PASS on context. `file-format.md`, `README.md` and `MAINTENANCE.md` are untouched and still describe import. See the Work Checklist

## Corrections

## Handoff Capsule

### Status

implementing - steps 1-4 done, step 5's code done, step 5's doc pass unfinished

### What's Done

Code:

- `managing-tasks/lib/commands/create.mjs`: added `cmdGetNewUid`; DELETED `cmdImport`; unused imports trimmed
- `managing-tasks/lib/commands/lifecycle.mjs`: added `cmdVerify` + private `reaches()` helper
- `managing-tasks/lib/commands/mutate.mjs`: `hasCycle` exported (was module-private)
- `managing-tasks/lib/schema.mjs`: added `EXIT` symbol; DELETED `validateBatch` + `detectLabelCycles`
- `managing-tasks/lib/cli.mjs`: `get-new-uid` and `verify` routed + helped; `import` removed; `main()` returns `res?.[EXIT] ?? 0`

Tests (60 green):

- `managing-tasks/tests/helpers.mjs`: NEW - `scratch`, `runCLI`, `seed`, `seedRaw`
- `managing-tasks/tests/uid.mjs`: NEW - 7 tests
- `managing-tasks/tests/verify.mjs`: NEW - 12 tests, plus "import verb no longer exists"
- `managing-tasks/tests/test.mjs`: 11 fixtures migrated to `seed()`, 2 import tests re-expressed, 2 `validateBatch` tests deleted
- `managing-tasks/tests/context.mjs`: 3 import tests re-expressed, 1 `validateBatch` test deleted

Docs:

- `managing-tasks/references/cli-reference.md`, `exit-codes.md`, `integration-contract.md`, `SKILL.md`: import out, `get-new-uid` + `verify` in
- `planning-tasks/SKILL.md`, `planning-tasks/references/managing-tasks-integration.md`: direct writes + verify gate

### Work Checklist

Only step 5's doc pass remains. All prose, no test gate.

- [-] `managing-tasks/references/file-format.md`: NOT started, and it is the important one. Must GAIN the id/prefix/uid allocation rules that lived only in `create.mjs`. They are already written up in `integration-contract.md` § Allocation rules - copy the substance there rather than reinventing, but note D-14: the contract owns the producer view, file-format owns the on-disk view. ALSO: `:145` "Safe to hand-edit" needs the carve-out flagged in 0005 (hand-editing `depends_on` leaves `depends_on_uids` stale, and `:126` rewrites `depends_on` FROM that stale mirror at the next merge)
- [ ] `managing-tasks/README.md`: 6 hits on import/batch. Also carries the 0005 debt - never mentions `kind` or `context[]`, routes handoff to the deleted `/preserving-session-memory` (lines 9, 188, 209), hardcodes `~/.claude/skills` (line 18) where SKILL.md now says `${skills_dir}`. Do it in one pass
- [ ] `managing-tasks/MAINTENANCE.md`: grep said 0 hits for import/batch, so it may need nothing. Verify before declaring done
- [ ] Final: `grep -rn "task import\|label_map\|depends_on_labels" ~/.claude/skills/` must come back clean apart from journal files, which are immutable evidence and stay

### What's Next

1. Finish the three docs above, `/writing-llm-document` loaded first
2. Run `npm test` in `managing-tasks/` one more time (docs-only changes, but cheap)
3. Ask the user about committing. Standing instruction from 0003, still in force: commit only once the skill is confirmed ready to use. This is now a large diff - 14 modified files plus 3 new test files - and it is the whole import-removal track
4. Still unanswered across sessions: Q-07 (`task show` renders `context[]` as YAML, not spec R2's human block) and Q-04 (splitting the 5a Dependencies row)

### Failed Approaches

No task tracker in this repo, so this lives here. Nothing was abandoned, but one process failure repeated three times and is worth not repeating:

- **Writing a RED test whose assertion is satisfied by the feature's absence.** Hit three times: `--count 0` expecting exit 3 (but `unknown command` is also exit 3), "verify does not modify files" (a nonexistent verb modifies nothing), and it would have hit a fourth time on "import verb no longer exists" had that been written before the rest. Root cause: asserting an error CODE or an ABSENCE without also asserting the code path was reached. Fix that worked: pair the assertion with a positive witness - `assert.doesNotMatch(out, /unknown command/)`, or assert the operation actually ran and returned its own failure first. Reading the failure MESSAGE at RED, not just the non-zero, is what caught all three

### Open Questions (session-scoped)

- Q-07 (from 0003) and Q-04 (from 0002) untouched again. Raised Q-07 with the user at the start of this session; he answered "go" without ruling, so it stays open
- The two deferred doc items from 0005 (`README.md`, `file-format.md:145`) were raised and likewise not ruled on. I folded them into step 5's doc pass rather than deferring a third time - if the user wanted them left alone, that is a revert of the checklist items above

### Uncommitted Changes

Everything. 14 modified files + 3 untracked test files (`tests/helpers.mjs`, `tests/uid.mjs`, `tests/verify.mjs`). Nothing staged, no stash, HEAD still `a261f34`.

Note for the next session: `git status` from inside `managing-tasks/` with a relative pathspec will lie (C-11). Run git from the repo root.

### Docs That Will Need Reading

- `/writing-llm-document` - before touching `file-format.md`, `README.md` or `MAINTENANCE.md`. The whole remaining checklist is prose
- `managing-tasks/references/integration-contract.md` § Writing task files directly + § Allocation rules - the source for what `file-format.md` must gain, and the D-14 owner of the producer view
- `context/session_states/COMMON.md` - C-13/C-14/D-13 still bound what may be built inside `managing-tasks`
- `managing-tasks/references/exit-codes.md` - only if a new code comes up. None should; `verify` reuses 4

### Docs That May Need Updating

Covered by the Work Checklist - `file-format.md`, `README.md`, `MAINTENANCE.md`. Nothing else known stale.

### Retrieval Hints

- the exit-code channel for a successful-but-non-zero command: grep `EXIT`, `Symbol.for("managing-tasks.exit")`
- the new fixture builder: grep `seed(`, `seedRaw`, `tests/helpers.mjs`
- the id-uniqueness gap that import used to mask: grep `duplicate-id`
- `reaches(` in `lifecycle.mjs` groups cycle members so one cycle is one problem - the non-obvious part of `cmdVerify`
- still parked from 0005: merging `managing-tasks` + `planning-tasks`, grep `kanban`
