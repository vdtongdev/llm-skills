---
id: 0001
slug: planning-tasks-hardening
started: 2026-07-30
finalized: true
branch: master
head: 5ccf27c
tasks: []
topics: [planning-tasks, managing-tasks, writing-llm-document]
---

# Session 0001 - planning-tasks-hardening

## Milestones

Written retroactively at offboard; the skill was invoked late in the session.

- done: analysed `prd-enrolment-schedule-attendance.md` (2035 lines, ~19.7k words) as field evidence for `/planning-tasks` quality. Section split measured: Requirements 995 lines, Implementation Details 432, the four self-containment sections only 230
- decision: PRD length is not the defect. 13 requirements at ~76 lines each is normal for a schema restructure. The defect is review archaeology interleaved with spec - 74 markers total (`supersedes` / `REPLACES` / `retracted` / `5b round N` / `earlier draft`), 35 of them inside Requirements
- abandoned: capping PRD size by line count. Wrong instrument - a well-partitioned 2000-line spec is fine, an interleaved 600-line one is not
- abandoned: the rule "a requirement must be implementable from Context Primer + that section alone". It pushes cross-cutting rules to be inlined per section, and duplicated rules diverge. Codex raised it; the source PRD confirms it (C-39 cited by R2/R5/R9, plus an "Anchor note" section existing purely to manage citation drift)
- decision: split the PRD three ways, not two - normative contract and load-bearing rationale stay in the PRD, deliberation record moves out (codex refinement over my original two-way cut)
- decision: consolidate the PRD in place after every 5b round rather than appending. User's framing: "feature: xxx. detail: bb, guard for potential issue xx, aa"
- decision: keep rationale for any constraint that looks removable. Test adopted from codex - "could a competent implementer delete this as an obvious simplification without realising what breaks?" The source PRD already contains the literal defensive sentence "Do not 'simplify' any of those orderings", which is the failure mode
- done: `planning-tasks/SKILL.md` - 5b loop rewritten (quote verification, self-disclosure, session/model/HEAD recorded, round N+1 scoped at round N's new text), new 5c consolidation section, new Decision Record section
- decision: `codex exec resume --last` is wrong in two places and contradicts both the user's global CLAUDE.md and the source PRD's own note. Fixed to explicit session id, plus the stdin and flag-order gotchas
- decision: re-run 5a between 5b rounds, scoped to edited sections. The source PRD's round 3 says two of its five findings "required no adversarial reasoning at all - they were internal contradictions that the consistency pass owed since round 2 would have caught far more cheaply"
- done: diagnosed the TDD-forgotten bug as enforcement, not model error. TDD was described in four places and required in zero; the enforced gate list had no TDD row, and both gate tables carried the escape hatch "Only where project mandates TDD"
- done: found `SKILL.md:143` actively encoded test-AFTER - "Tests depending on production code: add a dep". Inverted. Probably a larger contributor than the missing gate
- decision: TDD gate is blocking, scope derived from `files[]` rather than self-asserted, satisfied by one of RED/GREEN subtasks, populated `tests[]`, or a stated deviation. Silence is not a deviation
- decision: per-layer testing policy declared by the project (normally its CLAUDE.md), not defaulted by the skill. User's call, agreeing with codex that default-on TDD is overreach. Frontend gets `tests-required` rather than `tdd` - behaviour is specifiable in advance, layout is discovered while building
- abandoned: `planning-tasks/MAINTENANCE.md`. Created, then deleted at user challenge. It was written because `/maintaining-skills` step 2 halts without one, not because routing was unclear - and this session proved the routing was self-evident. It also contained 300/200 line thresholds I had invented on the spot
- decision: the two rules in it worth keeping were general, not planning-tasks facts. Relocated to `writing-llm-document/references/style-guide.md` as "Rules That Must Bind"
- decision: `task lint` as a separate command, NOT a check inside `task import`. Codex wanted import to reject; that would put methodology enforcement inside a tracker whose own MAINTENANCE.md says workflow guidance "live[s] in /planning-tasks, not here". Tracker ships mechanism, project ships policy
- decision: keep task-level `kind` alongside the new `context[]`. User wanted `kind` replaced; the indirection is buying single-point-of-edit against rename rot. Division: `kind` = per-layer default bundle, `context[]` = task-specific delta only
- done: spec written at `context/prd-task-context-and-lint.md` (~190 lines), unreviewed

## Corrections

None. First session in this journal.

## Handoff Capsule

### Status

planning - spec written, neither review pass run, nothing built

### What's Done

- `planning-tasks/SKILL.md`: 5b loop rewritten; new 5c "Consolidate the PRD After Each Round" + "The Decision Record"; blocking TDD gate with per-layer policy table in § 6; dependency rule inverted away from test-after; compliance summary added to batch review; two bullets added to What Makes a Good Plan
- `planning-tasks/references/adversarial-reviewer-prompt.md`: reviewer told to attack fix-text as unreviewed prose; attorney section gains quote-verification and self-disclosure; resume section corrected to explicit session id with stdin and flag-order notes
- `planning-tasks/references/managing-tasks-integration.md`: `Subtasks (TDD)` row replaced by blocking `TDD shape` row + `Testing policy` row; `tests OR notes` gate tightened
- `writing-llm-document/references/style-guide.md`: new "Rules That Must Bind" section (obligation-vs-description; prose without a checklist entry is advisory; a fifth mention does not bind, remove the escape hatches instead)
- `context/prd-task-context-and-lint.md`: new spec for `context[]` + `task lint`
- `planning-tasks/MAINTENANCE.md`: created then deleted, deliberately. Do not recreate without reading Failed Approaches below

### Work Checklist

- [ ] `context/prd-task-context-and-lint.md`: run 5a completeness pass. Not started
- [ ] `context/prd-task-context-and-lint.md`: run 5b adversarial pass. Not started. Resume codex session `019fb21a-1b5b-7640-ba7e-37f2c025b552` (it already holds this session's two rounds of skill context) rather than starting cold
- [ ] implement the spec: `managing-tasks` schema + CLI + lint command + tests, then the `planning-tasks` emitter side. Not started
- [ ] `planning-tasks/references/prd-template.md`: four proposed changes, user has not ruled. Not started
- [ ] `prd-enrolment-schedule-attendance.md` at repo root: untracked stray, decide where it belongs. Not started

### What's Next

1. Run 5a on `context/prd-task-context-and-lint.md` per `planning-tasks/references/plan-reviewer-prompt.md`.
2. Run 5b on it, resuming the codex session id above. Scope the round at the two design calls that are mine rather than the user's: `context[]` mirroring `sources[]` as a discriminated list, and `task lint` being separate from `import`. Those are the least-reviewed decisions in the spec.
3. Apply 5c consolidation to the spec after each round - this spec is the first artifact that dogfoods the rule written this session.
4. Get the user's ruling on the four `prd-template.md` changes (below) before building, since one of them (Execution Order) would change the spec's own shape.
5. Build, in the order the spec's Files to Modify implies: `schema.mjs` first, then CLI dispatch and mutate handlers, then `lint.mjs`, then docs, then the `planning-tasks` emitter.

### Failed Approaches

No task tracker in this repo, so these live here.

- **Line-count threshold for PRD size.** Proposed max lines per PRD. Wrong instrument: length is not what makes a document unwieldy, and the measurement showed the spec content was proportionate. Root cause of the real problem was interleaving, not volume. Replaced by the consolidation rule.
- **"Requirement implementable from Primer + that section alone".** Sounded testable, but it forces every cross-cutting rule to be copied into each requirement that depends on it, and copies diverge. Root cause: self-containment at section granularity conflicts with single-source-of-truth. Replaced with "name every dependency explicitly, cite the one normative statement, never inline it".
- **`planning-tasks/MAINTENANCE.md`.** Created to satisfy `/maintaining-skills` step 2, which halts on a missing config. Root cause of the mistake: process-driven rather than need-driven - the routing table restated five self-evident filenames, and I fabricated size thresholds with no basis. Do not recreate. If `/maintaining-skills` halts on this skill again, the right fix is softening that step, not manufacturing the file.
- **Enforcing the TDD gate inside `task import`** (codex's proposal). Rejected: breaks the tracker's stated neutrality (`managing-tasks/SKILL.md:48` "Tracker does not enforce"; MAINTENANCE.md reserves machine-enforcement for invariants). Replaced by policy-driven `task lint` that `planning-tasks` calls.

### Open Questions (session-scoped)

- The four `prd-template.md` changes: promote `Execution Order`, promote `Review history`, prefer `path:symbol` over line numbers with a stamped verification commit, and add a "does the suite stay green after each step?" row. User has not ruled. All four are backed by things the source PRD had to invent under pressure.
- Where `prd-enrolment-schedule-attendance.md` should live. It is untracked at the repo root and looks like a stray copy from another project.

### Uncommitted Changes

Everything. Nothing was committed this session. `git status`: 4 modified (`planning-tasks/SKILL.md`, `planning-tasks/references/adversarial-reviewer-prompt.md`, `planning-tasks/references/managing-tasks-integration.md`, `writing-llm-document/references/style-guide.md`), plus untracked `context/` and the stray `prd-enrolment-schedule-attendance.md`. No stash.

### Docs That Will Need Reading

- `context/prd-task-context-and-lint.md` - the spec itself, before any implementation
- `managing-tasks/MAINTENANCE.md` - its routing table and contract-version rules govern every doc edit the spec prescribes; also the source of the neutrality constraint
- `managing-tasks/references/file-format.md` and `lib/schema.mjs` - the `sources[]` pattern that `context[]` copies
- `/planning-tasks` § 5a and 5b - the review passes queued next
- `/writing-llm-document` - before editing any skill prose

### Docs That May Need Updating

- `planning-tasks/references/prd-template.md`: went stale this session. SKILL.md § 5c now prescribes a decision record and a consolidation discipline that the template does not describe, so a PRD written from the template alone has nowhere to put rejected alternatives. This is separate from the four proposed changes above and should be fixed regardless of how the user rules on those.

### Retrieval Hints

- codex session `019fb21a-1b5b-7640-ba7e-37f2c025b552` - two rounds on skill design (consolidation rule, TDD gate). Transcript at `~/.codex/sessions/2026/07/30/`
- grep terms: `Rules That Must Bind`, `TDD shape`, `test-exempt:`, `Reopen only if`, `context[]`, `task lint`
- source evidence for every skill change this session: `prd-enrolment-schedule-attendance.md` § Review history
