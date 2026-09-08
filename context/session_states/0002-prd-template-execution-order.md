---
id: 0002
slug: prd-template-execution-order
started: 2026-07-31
finalized: true
branch: master
head: 5ccf27c
tasks: []
topics: [planning-tasks, managing-tasks]
---

# Session 0002 - prd-template-execution-order

## Milestones

- done: onboarded from 0001. Clean shutdown confirmed - `finalized: true`, HEAD still `5ccf27c` as recorded, git status matched the capsule exactly. No drift, no stash, no recovery needed
- decision: Q-01 ruled by user. Of the four `prd-template.md` proposals, only "promote Execution Order" is approved. Promote Review history, `path:symbol` over line numbers, and the "suite stays green" row are all REJECTED
- decision: `prd-enrolment-schedule-attendance.md` stays untracked at the repo root. It is example/evidence material, to be removed when this work is done. Closes Q-02
- done: `planning-tasks/references/prd-template.md` - new `### Execution Order` under Implementation Details, before Test Plan. Numbered, one commit minimum per step, reasons required only where ordering is load-bearing
- done: `planning-tasks/references/plan-reviewer-prompt.md` - `Dependencies` row tightened to require the section's presence. Per C-02 a template section that is not in the 5a checklist is advisory
- note: rejecting the Review history promotion leaves SKILL.md § 5c's decision record with no slot in the template. Gap flagged to user, user's ruling stands. The § 5c staleness noted in 0001 is therefore only partly addressable

- done: 5a completeness pass on `context/prd-task-context-and-lint.md`. Status Issues Found, one real citation error plus one advisory, both verified independently before fixing. `references/integration-contract.md § Source envelope format` does not exist (`grep -i envelope` on that file returns nothing); the real spec is `references/cli-reference.md:36`. `lib/cli.mjs:30-42` was a middle slice of `ROUTER`, which spans `:20-51`. Both fixed in place
- decision: the 5a reviewer did NOT flag the spec's missing `Execution Order` despite the tightened `Dependencies` row naming it explicitly. Checklist row alone was not enough to make a MISSING section visible - the reviewer checked ordering of what was present. Suggests absence-checks need to be phrased as "section present?" separately from "content correct?"
- done: `Execution Order` written into the spec. Surfaced a design fact none of the prose had stated: `context[]` (R1/R2) and `task lint` (R3/R4) are independent tracks, lint never reads `context[]`

- done: 5b round 1 on the spec, codex session `019fb21a-1b5b-7640-ba7e-37f2c025b552` resumed. 6 findings: 1 CRITICAL, 3 HIGH, 1 HIGH, 1 MEDIUM. Not yet triaged with the user
- done: answered codex's three codebase questions from the tree. Q1: `mutate()` at `lib/commands/mutate.mjs:348` does `raw(t)` = `{...t._raw}` (whole parsed YAML) and `save()` at `:18-22` strips only `_`-prefixed keys, so mutation commands DO preserve unknown top-level keys. But `cmdImport` at `lib/commands/create.mjs:114-129` builds the task from an explicit field whitelist, so import DROPS them. F6 splits: rebutted on the mutate path, conceded on import
- done: Q3 answered YES - `validateBatch(batch)` at `lib/commands/create.mjs:72` runs before `withLock` and before any write, a shared pre-write hook. This materially lowers the cost of codex's F3 (import-side policy enforcement) and weakens my D-08 rejection
- self-found: PRD R2 specifies `task rm-context <id> --ref <r>` and calls it a mirror of `rm-source`, but `cmdRmSource` (`lib/commands/mutate.mjs:234-236`) takes positional `<id> <ref>`. The stated mirror does not mirror

- decision: USER RULED - add import-side policy enforcement. This REVERSES 0001 D-08 ("enforcement lands in a separate `task lint`, not inside `task import`"). New R4b written into the spec. Neutrality is now preserved by opt-in (no `.tasks/policy.yaml` = no enforcement, byte-identical behaviour) rather than by non-enforcement. Codex F3 CRITICAL conceded in full
- done: R4b applied across the spec - Overview, Context Primer neutrality paragraph, new R4b requirement, Out of Scope flipped, two Known Risks replaced (`--skip-policy-check` bypass, hand-edited files uncovered), R5, Files to Modify, Execution Order step 5b, Test Plan
- note: `managing-tasks/SKILL.md:48` "Tracker does not enforce" must be AMENDED, not left alone. The spec previously promised to keep it intact; R4b contradicts it and a doc left contradicting the code is how the original TDD bug survived

- done: 5c consolidation applied. F1, F2, F4, F5, F6 and the self-found `rm-context` signature all folded into the spec in place, not appended
- correction (within this session, my own text): I first specified the new deviation state as exit 1. WRONG - `managing-tasks/references/exit-codes.md` allocates 1 to `internal` and states *"Domain errors never fall back to 1"*, and `bin/task:12` exits 1 on any unhandled throw, so deviations would be indistinguishable from crashes. Reallocated to new code 7 (`policy-deviation`), verified unused in both the table and the code. Caught by verifying my own instruction instead of leaving it as a note for the implementer
- done: scoped 5a over the rewritten sections per SKILL.md 5c. Status Clean. All seven factual claims added during the rewrite verified against the tree, including `cmdImport`'s whitelist genuinely lacking `context` and exit 7 genuinely free
- note: F5's fix (two-stage policy resolution, strictest-wins) carries an explicit do-not-simplify sentence, per 0001 D-02. Collapsing stage 2 into stage 1 restores the silent-demotion bug

## Corrections

None yet.

## Handoff Capsule

### Status

planning - spec reviewed through 5a + one 5b round and consolidated, nothing built

### What's Done

- `planning-tasks/references/prd-template.md`: new `### Execution Order` section under Implementation Details, before Test Plan
- `planning-tasks/references/plan-reviewer-prompt.md`: `Dependencies` row tightened to require `Execution Order` present and numbered
- `context/prd-task-context-and-lint.md`: 5a fixes (two citation errors), new `Execution Order`, new R4b import-side enforcement, and 5c consolidation of all six 5b findings plus one self-found

### Work Checklist

- [-] `context/prd-task-context-and-lint.md`: reviewed through 5b round 1, all findings consolidated in, scoped 5a clean. Round 2 NOT run - user chose to stop. R4b is the newest unreviewed prose in the document
- [ ] implement the spec: `managing-tasks` schema + CLI + `lint.mjs` + R4b import enforcement + tests, then the `planning-tasks` emitter side. Not started. Follow the spec's own Execution Order, steps 1-7
- [ ] `managing-tasks/SKILL.md:48` and `MAINTENANCE.md`: must be amended as part of the build, not after. R4b contradicts "Tracker does not enforce" as currently worded
- [ ] `prd-template.md` intro line 3 ("Not every PRD needs every section") vs the 5a row now requiring `Execution Order`. User ruled: leave it, each project decides. No action unless it causes a false flag

### What's Next

1. Build, following the spec's Execution Order. Steps 1-4 are the `context[]` track, 5-5b the lint track; they are independent and either can go first. Step 1 (schema + the old-CLI compat test) must be alone and first within its track.
2. The two doc amendments (`SKILL.md:48`, `MAINTENANCE.md`) land with step 6, not as follow-up.
3. Optional: 5b round 2 scoped at R4b if the build surfaces doubts about it.

### Failed Approaches

No task tracker in this repo, so these live here.

- **Deviation state as exit code 1.** My own error, caught before it reached an implementer. `references/exit-codes.md` allocates 1 to `internal` ("Crash, unexpected IO failure") and states *"Domain errors never fall back to 1"*; `bin/task:12` exits 1 on any unhandled throw. A deviation signalled as 1 is indistinguishable from a crash. Root cause: I wrote "confirm 1 is free" as an instruction for the implementer instead of confirming it myself. Replaced by new code 7 (`policy-deviation`), verified free in both the table and the code.
- **Enforcing the TDD gate in `task lint` ALONE** (0001 D-08). Reversed this session by user ruling. Codex F3: the chain "prompt tells agent to lint -> lint may no-op -> prompt tells agent to honour exit 4 -> import accepts anything" is still checklist enforcement under context pressure, which is the exact defect the gate exists to fix. Root cause of the original decision: I treated neutrality as meaning "never enforces" when the defensible reading is "never *chooses*". A project creating `.tasks/policy.yaml` has already chosen. Replaced by R4b.
- **Relying on a checklist row to catch a MISSING section.** Tightened the 5a `Dependencies` row to name `Execution Order`, then watched the 5a reviewer not flag its absence in the very next run - it audited the ordering that was present. Root cause: presence-checks and content-checks are different questions and one row cannot ask both. Not yet fixed; would need the row split.

### Open Questions (session-scoped)

- Whether the 5a `Dependencies` row should be split into a presence check and a content check. Evidence for it is direct (the reviewer missed a missing section immediately after the row was written), but it is a third change to the review prompt and was not raised with the user.
- Whether `context[]` and `task lint` should be two separate PRDs. The Execution Order pass proved they are independent tracks sharing only R5. Not raised with the user.

### Uncommitted Changes

Everything, still. Nothing has been committed across sessions 0001 and 0002. `git status`: 6 modified (`planning-tasks/SKILL.md`, `planning-tasks/references/{adversarial-reviewer-prompt,managing-tasks-integration,plan-reviewer-prompt,prd-template}.md`, `writing-llm-document/references/style-guide.md`), plus untracked `context/` and `prd-enrolment-schedule-attendance.md`. No stash. The user has been offered a commit once and did not take it; offer again rather than committing unasked.

### Docs That Will Need Reading

- `context/prd-task-context-and-lint.md` - the spec, before any implementation
- `managing-tasks/MAINTENANCE.md` - the neutrality constraint R4b amends, and its contract-version rules
- `managing-tasks/lib/{schema,cli}.mjs`, `lib/commands/{create,mutate}.mjs` - the four files the build edits most
- `managing-tasks/references/exit-codes.md` - before touching exit codes; it is the canonical contract and it bites
- `/writing-llm-document` - before editing any skill prose

### Docs That May Need Updating

- `managing-tasks/SKILL.md:48` and `MAINTENANCE.md` § Classification Rules: not stale yet, but they become wrong the moment R4b is built. Tracked as a checklist item above rather than a doc chore, deliberately.

### Retrieval Hints

- codex session `019fb21a-1b5b-7640-ba7e-37f2c025b552` now holds the skill-design rounds AND 5b round 1 on this spec. Transcript under `~/.codex/sessions/2026/07/30/`
- grep terms: `R4b`, `policy-deviation`, `--skip-policy-check`, `strictest`, `two-stage`, `test-exempt:`, `Execution Order`
- the whitelist that drops unknown fields on import: `lib/commands/create.mjs:114-129`
