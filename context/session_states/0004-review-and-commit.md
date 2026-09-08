---
id: 0004
slug: review-and-commit
started: 2026-07-31
finalized: true
branch: master
head: a261f34
tasks: []
topics: [managing-tasks, planning-tasks, testing]
---

# Session 0004 - review-and-commit

## Milestones

- done: onboarded from 0003. Clean shutdown confirmed - `finalized: true`, HEAD still `5ccf27c`, working tree matched the capsule exactly. No drift, no stash, no recovery. COMMON.md at 48 nonblank lines, no compaction needed
- decision: USER APPROVED the 0003 capsule plan as-is - (1) adversarial review pass over the diff, (2) settle the `task show` deviation (Q-07), (3) commit, (4) delete `prd-enrolment-schedule-attendance.md`

- done: review pass. Two independent readings - my own full-file pass, plus an adversarial subagent given the PRD as the contract. I reproduced the subagent's three highest findings myself rather than accepting them (path-spelling evasion, `policy.yaml` scanned as a task, exit 1 on wrong-typed batch fields). Both suites still green: 26 + 42
- decision: NOT fixed in this session - review documents, it does not fix. 14 findings, 4 HIGH. Commit is BLOCKED on the HIGHs

### Review findings (0004)

HIGH-1 `lint.mjs:70-72` `normalizePath` is textual: strips one leading `./`, no `..` resolution, no absolute-path rejection. REPRODUCED: with `backend/** -> tdd`, `backend/x.py` imports at exit 4 (blocked) while `././backend/x.py`, `/repo/backend/x.py` and `svc/../backend/x.py` all import at exit 0. Defeats R3's central claim ("scope is derived from paths, never asserted by the task") - the producer does not assert scope with a field, it just spells the path differently. Silent.

HIGH-2 A task with no `files[]` escapes the gate entirely. REPRODUCED: batch task with a goal and no `files[]` -> `lint` prints "Unresolvable" but exits 0, `import` exits 0 printing NOTHING (`enforcePolicy` only prints violations and deviations, never the summary). `cli-reference.md` § Policy claims it is "reported as unresolvable rather than passing silently"; through `import` it passes silently, and `planning-tasks` keys on the exit code. Omitting `files[]` is the cheapest self-exemption available.

HIGH-3 Installing a policy converts exit 3 into exit 1. `checkTasks` (`lint.mjs:121,134,138`) assumes `files`/`notes`/`subtasks` are arrays, but `validateBatch` never type-checks them. REPRODUCED: `files: "backend/x.py"` -> `(task.files || []).map is not a function`, exit 1. Same batch with no policy file -> exit 3. Breaks `exit-codes.md`'s own "Domain errors never fall back to 1" (C-09), and only on the policy-installed path.

HIGH-4 `.tasks/policy.yaml` is scanned as a task file. `cache.mjs:28` skips only dotfiles and non-`.yaml`. REPRODUCED: `task list` shows a permanent `[?] INVALID  policy.yaml: uid required (string)` row in every opted-in project. It also lands in the cache index. `tests/policy.mjs:502` works around this in the TEST (`filter(f => f !== "policy.yaml")`) rather than fixing the code

MEDIUM-5 Mutation commands and `task new` are unenforced write paths. REPRODUCED: import a `docs/a.md` task (exit 0, correctly out of scope), then `task add-file 2 backend/y.py:modify` -> exit 0, no check; `task lint` afterwards -> exit 4. The PRD § Known Risks asserts "`import` and the mutation commands are the enforced paths". False, and quieter than `--skip-policy-check`, which the PRD spends a paragraph making loud.

MEDIUM-6 `--policy <path>` on `import` is a second, SILENT bypass. REPRODUCED: a batch that lints at exit 4 imports at exit 0 under `--policy lax.yaml`. Documented in `cli-reference.md`'s signature but nowhere as an override, and it prints no warning - the whole point of `--skip-policy-check`'s design.

MEDIUM-7 `task lint <batch>` never calls `validateBatch`. REPRODUCED: a batch with `task:` instead of `tasks:` lints CLEAN at exit 0 while `import` rejects it at exit 3; `context: [null]` makes lint exit 1. Contradicts "same checks, same verdict" (`cli-reference.md` § Policy).

MEDIUM-8 `test-exempt:` needs no reason. `lint.mjs:133-135` checks the prefix only. `notes: ["test-exempt:"]` -> accepted deviation. Docs (PRD R4 and cli-reference) both say "and naming a reason".

MEDIUM-9 Batch tasks without a `label` render as `<unnamed>` in the compliance summary (`lint.mjs:128-131` - batch entries have no `id`). The summary is the artefact `planning-tasks` puts in front of the user.

MEDIUM-10 The no-arg sweep drops schema-invalid task files (`lint.mjs:269` filters `status !== "invalid"`). The PRD sells that sweep as the net for hand-edited files; a hand-edit that also breaks schema vanishes and lint reports clean.

LOW-11 `globToRegExp` `**` over-matches: `a/**/b` matches `a/xb`, `**/*.md` matches `READMExx.md` (consuming the `/` drops the segment anchor). Emit `(?:.*/)?` for a `**/` prefix.
LOW-12 `src/**` does not match bare `src`.
LOW-13 Repeated `--policy` -> `assignFlag` makes it an array -> `resolve()` throws -> exit 1 (should be 3).
LOW-14 `parseArgs` has no boolean-flag set, so `task import --skip-policy-check b.yaml` eats the positional. Pre-existing parser shape.
MINOR-15 `formatSummary` breakdown omits violations, so the lines do not sum to "Production-code tasks".
MINOR-16 No `npm test` script; `tests/policy.mjs` is wired into no runner. Both files must be run by hand.

Test blind spots: the identical-verdict test covers only the two cases that agree (never the 7-vs-0 deviation case); every resolution test uses canonical paths, so HIGH-1 passes the suite; no fixture is malformed, so HIGH-3 is invisible; `test-exempt:` is only tested WITH a reason; exit 7 is asserted through `exitCodeFor()` only, never end-to-end through the CLI; no test for `--policy` at all.

- decision: USER RULED - option A, revert the whole lint/policy track, keep `context[]`. Rationale in the user's words: "I don't see an issue with agent skipping tdd, I can detect and correct it. This much work for such a trivial convenience improvement is scope creep." The feature was built to close a hole the user already covers by hand
- abandoned: `.tasks/policy.yaml` + `task lint` + R4b import enforcement. Root cause of the revert is not the 14 bugs, it is that the gate's threat model is a producer cutting corners, and that same producer writes every input the gate reads (`files[].path`, whether `files[]` exists, the notes text). Fixing HIGH-1/HIGH-2 makes evasion inconvenient, not impossible - a task can declare `files: [docs/x.md]` and the executor touches backend anyway. Self-reported scope is unfalsifiable at planning time
- note: MY ERROR, recovered. A `cd managing-tasks && ... ; rm tests/policy.mjs lib/commands/lint.mjs` ran from INSIDE `managing-tasks/`, so the `cd` failed, the `&&` chain skipped the file I was creating, and the `;` let the `rm` run anyway. Both files were untracked, so git had nothing. Recovered `policy.mjs` verbatim from the 0003 transcript JSONL (`~/.claude/projects/-home-user--claude-skills/73f41506-*.jsonl`) by pulling the largest Write tool_use payload for that path, verified against line offsets I had already read. C-11 was about pathspecs; this is the same family and cost the same way
- done: revert executed. Deleted `lib/commands/lint.mjs` and `tests/policy.mjs`; stripped `enforcePolicy`/`--skip-policy-check`/lint dispatch/exit 7/`TEST_POLICIES`/`CONTEXT_KINDS`; reverted the § Policy blocks in `cli-reference.md`, `exit-codes.md`, `SKILL.md`, `MAINTENANCE.md`, `integration-contract.md` and both `planning-tasks` files; restored `SKILL.md:48` "Tracker does not enforce."
- done: salvaged the 16 `context[]` tests into `tests/context.mjs`. Added the `npm test` script (`node --test tests/*.mjs`) - the suite was previously discoverable only by hand, and `node --test tests/` fails on Node 24
- note: 42/42 green (26 `test.mjs` + 16 `context.mjs`). Smoke-tested `context[]` through import, `add-context`, and `show`; `task lint` is gone; `task list` is clean

- done: deleted `prd-enrolment-schedule-attendance.md` (example material, agreed in 0002)
- done: COMMITTED, on `master` (every prior commit in this repo is direct to master). Two commits: `2c4ad00` managing-tasks `context[]`, `a261f34` planning-tasks review loop + TDD gate + style-guide + gitignore. Sessions 0001-0004 are now fully committed; the tree is clean
- note: one run of `npm test` showed 41/42 immediately after committing, then 42/42 on three consecutive runs. I could NOT capture which test failed - the detail scrolled. Almost certainly the `storage: concurrent lock serialized` flake 0003 documented at ~1 run in 5, but I did not verify it, so treat "which test" as unknown rather than settled

## Corrections

- correction: 0003's milestone "step 5b - `enforcePolicy()` in `create.mjs`" and the D-09/D-10/D-12 decisions describe code that no longer exists. Not wrong when written; superseded by the 0004 revert. See COMMON.md D-13

## Handoff Capsule

### Status

done, handed back to the user. Everything is committed and green. The next session's job is REVIEW, not implementation

### What's Done

- `managing-tasks/lib/commands/lint.mjs`: DELETED (was new in 0003, never committed)
- `managing-tasks/tests/policy.mjs`: DELETED; its 16 `context[]` tests salvaged into `managing-tasks/tests/context.mjs`
- `managing-tasks/lib/commands/create.mjs`: removed `enforcePolicy`, the lint import, `--skip-policy-check`. `--context` parsing and the import whitelist entry KEPT
- `managing-tasks/lib/cli.mjs`: removed lint dispatch, exit 7, policy flags from help. `add-context`/`rm-context` KEPT
- `managing-tasks/lib/schema.mjs`: removed `TEST_POLICIES` and `CONTEXT_KINDS` (both only served lint). `validateContext` KEPT
- `managing-tasks/package.json`: added `"test": "node --test tests/*.mjs"`
- `managing-tasks/{SKILL,MAINTENANCE}.md`, `references/{cli-reference,exit-codes,file-format,integration-contract}.md`: policy/lint text removed, `context[]` text kept. `MAINTENANCE.md` and `exit-codes.md` are now byte-identical to pre-0003
- `planning-tasks/SKILL.md`, `references/managing-tasks-integration.md`: lint calls, exit-code handling and `--skip-policy-check` removed; TDD gate prose kept; `test-exempt:` demoted from "load-bearing" to a greppable convention
- `prd-enrolment-schedule-attendance.md`: deleted

### Work Checklist

- [ ] review the user's manual edits (see What's Next 1) and write his preferences into COMMON.md as C-NN constraints
- [ ] Q-07: `task show` renders `context[]` as a YAML key rather than the human `Context:` block spec R2 asked for. Reasoning is C-10 (stdout YAML is the machine contract). Never ruled on by the user, and it is now the only open question about shipped code

### What's Next

1. **The user is hand-editing the skills between sessions.** First job next session: diff his edits (`git log`/`git diff` from `a261f34` forward, plus any uncommitted tree) and read them as PREFERENCE SIGNAL, not as changes to review for defects. Ask about anything whose intent is not obvious, then write what is learned into COMMON.md as constraints. That is the explicit purpose he stated for the next session
2. Settle Q-07 if he has an opinion once he has seen `task show` output in use
3. `context/prd-task-context-and-lint.md` is now half-obsolete: R1/R2 shipped, R3/R4/R4b/R5-lint are reverted (D-13). It is gitignored, so it costs nothing, but do not treat it as a live spec. Delete it or mark it superseded when convenient

### Failed Approaches

No task tracker in this repo, so these live here.

- **Enforcing a methodology gate inside the tracker.** `.tasks/policy.yaml` + `task lint` + import-side enforcement. Root cause of the failure is structural, not a bug list: the gate derives scope from `files[].path`, and the producer it constrains writes that string. `././backend/x.py`, `/repo/backend/x.py`, `svc/../backend/x.py` and simply omitting `files[]` all leave scope silently. An enforcement gate cannot bind the party that authors the data it reads (C-13). Do not rebuild without reading D-13's "reopen only if"
- **Bundling two unrelated features in one PRD.** `context[]` (40 lines, additive, clean) and `task lint` (600 lines, a config language, reverted) shared exactly one requirement. The bundle is how the lint track grew for three sessions without being challenged on its own merits. Q-05 asked this in 0002 and went unanswered
- **`cd X && ... ; rm ...` in one shell line.** Run from inside `X`, the `cd` fails, `&&` skips the file being created, and `;` lets the `rm` run anyway. Destroyed two untracked files. Recovery was possible only because the 0003 transcript JSONL held the original Write payload. Same family as C-11: shell commands that assume a cwd they did not verify

### Open Questions (session-scoped)

- Q-07 (above) is the only one. Q-04 from 0002 (splitting the 5a `Dependencies` checklist row into presence vs content) is still open in COMMON.md and was not raised this session either

### Uncommitted Changes

All committed. Working tree clean at `a261f34`. `context/` is gitignored by design, so this journal and the obsolete PRD are untracked on purpose. No stash

### Docs That Will Need Reading

- `/writing-llm-document` - before editing any skill prose, including when writing up the user's preferences
- `context/session_states/COMMON.md` - C-13, C-14 and D-13 are the load-bearing outcomes of this session

### Docs That May Need Updating

- `context/prd-task-context-and-lint.md` - obsolete for R3/R4/R4b, see What's Next 3

### Retrieval Hints

- grep terms for the reverted track: `policy.yaml`, `task lint`, `enforcePolicy`, `--skip-policy-check`, `test-exempt:`, `TEST_POLICIES`, `policy-deviation`. All are GONE from the tree as of `a261f34`; hits mean either this journal, 0002/0003, or a resurrection worth questioning
- the surviving feature: `context[]`, `validateContext`, `add-context`, `parseContextString`, `tests/context.mjs`
- commits: `2c4ad00` (context[]), `a261f34` (planning-tasks). Pre-revert state is NOT in git history - it only ever existed in the working tree, so 0003's capsule is the only record of what was built
- codex session `019fb21a-1b5b-7640-ba7e-37f2c025b552` holds the 5b round-1 findings on the now-obsolete spec
