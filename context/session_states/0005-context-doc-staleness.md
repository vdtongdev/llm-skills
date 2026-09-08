---
id: 0005
slug: context-doc-staleness
started: 2026-07-31
finalized: true
branch: master
head: a261f34
tasks: []
topics: [managing-tasks, journaling-session-memory]
---

# Session 0005 - context-doc-staleness

## Milestones

- done: onboarded from 0004. Clean shutdown - `finalized: true`, HEAD still `a261f34`, only dirty file is the user's own hand-edit to `managing-tasks/SKILL.md` (predicted by 0004's What's Next 1). COMMON.md at 49 nonblank lines, no compaction
- note: user's hand-edits to `managing-tasks/SKILL.md` read as preference signal: trim the description, drop the named-consumer list in favour of "any skill", replace the dot decision graph with a flat command list, generalise the binary path to `${skills_dir}` because codex uses `~/.codex/skills`
- done: fixed the four stale consumer-side spots - `managing-tasks/SKILL.md` § Proactive context loading (now covers `kind` AND `context[]`), its Auto mode step 2 and § File format sentence, and `journaling-session-memory/references/offboard.md:24`. Also repaired formatter damage in the user's hand-edit (stray `"`, `add-*`/`rm-*` asterisks eaten as emphasis)
- note: `managing-tasks/README.md` is the one doc in the skill that never mentions `kind` or `context[]` at all, and still routes handoff to the deleted `/preserving-session-memory` (lines 9, 188, 209) and hardcodes `~/.claude/skills` (line 18). Left alone deliberately - user-facing content decision, not a repair
- note: `task next` emits ` kind:<domain>` and nothing for `context[]` (`cli-reference.md:86`), so the field that CANNOT be reconstructed from project config is the one the "what now" command hides. Worked around in prose (tell the agent to run `show`); the real fix is in `next`

- correction: my first staleness scan grepped for the literal `context[]` token, which finds every producer-side doc and misses exactly the consumer-side prose that is stale. User's correction: read the files for what they are responsible for, do not pattern-match a token. `kind` appears in sample YAML everywhere, so token frequency says nothing about which doc explains the behaviour

- correction: I claimed direct file writes would lose dependency cycle detection ("silent deadlock in `next`"). Wrong, and backwards. `hasCycle` already walks the real id graph across all tasks (`mutate.mjs:141-144`), so a repo-wide check is three lines of reuse. Meanwhile `detectLabelCycles` (`schema.mjs:131-162`) only ever saw intra-batch label edges - external `depends_on` never enters its graph, so `task import` today CANNOT detect a cycle routed through an existing task. Direct writes plus a repo-wide check are strictly stronger than what exists
- note: `uid` has no format validation anywhere - `requireString` only (`schema.mjs:25`), and nothing outside `create.mjs` reads its contents. ULID's timestamp prefix is load-bearing only for the manual merge procedure at `file-format.md:126` ("keep the earlier-created one's id"). User's answer: a `task get-new-uid` verb
- note: SCOPE DISCOVERY. `import` is the test suite's fixture builder - 17 of 42 tests call `runCLI(dir, "import", ...)`, but only ~4 test import itself. The other 13 use it to cheaply build a two-tasks-with-a-dep state. Deleting import means a `seed()` helper and rewriting 40% of the suite. This is the riskiest part of the removal, not the deletion
- decision: USER RULED - doc ownership option C. `managing-tasks/references/integration-contract.md` is the single source of truth for the producer contract; producer skills read it rather than keeping copies. Consolidated against CURRENT (batch) reality deliberately, so the later `import` removal edits one doc instead of two
- decision: USER PARKED - possible future merge of `managing-tasks` + `planning-tasks` into one skill (working name "kanban") with planning/execution modes, shaped like journaling-session-memory's onboard/offboard modes. Explicitly "something for future me to consider", NOT this session's work
- done: consolidation executed. `integration-contract.md` gained the source/context envelope spec, the full 8-step submission loop with exit-code branches, and the `label_map` failure contract; lost the per-task quality gates (those are editorial, moved to planning-tasks); its two `/preserving-session-memory` sections rewritten for `/journaling-session-memory`. `planning-tasks/references/managing-tasks-integration.md` cut from 131 to 37 lines - now a pointer plus the quality checklist and drift handling. `planning-tasks/SKILL.md:227,243` repointed. 42/42 tests still green (docs-only)

- done: thinned `cli-reference.md:36-37` to flag signature plus a pointer at the contract's envelope section, per the user. Envelope rules now stated in exactly one place

## Corrections

(none - no finalized session file was contradicted this session. The correction on my own
cycle-detection claim is a Milestones entry above, made and superseded within this session.)

## Handoff Capsule

### Status

planning done, implementation not started. The whole of next session is coding work, and it is TDD-gated

### What's Done

Docs only. No code, no schema, no test changes this session.

- `managing-tasks/SKILL.md`: § Proactive context loading rewritten to cover `kind` AND `context[]`; Auto mode step 2 and the § File format sentence widened to match; user's formatter damage repaired (stray `"`, eaten `add-*`/`rm-*` asterisks)
- `managing-tasks/references/integration-contract.md`: declared the single source of truth for the producer contract. Gained the source/context envelope spec and the 8-step submission loop with exit-code branches; lost the per-task quality gates (editorial, moved out); both `/preserving-session-memory` sections rewritten for `/journaling-session-memory`
- `managing-tasks/references/cli-reference.md`: `--source`/`--context` envelope rules replaced by a pointer
- `planning-tasks/references/managing-tasks-integration.md`: 131 -> 37 lines. Pointer to the contract with an explicit "the contract wins" tiebreak, plus the quality checklist and drift handling
- `planning-tasks/SKILL.md`: `:227` repointed at the contract by absolute path, `:243` defers exit-code handling
- `journaling-session-memory/references/offboard.md`: "Docs That Will Need Reading" now sources from the task's `context[]` first, `kind` table second

### Work Checklist

Implementation, in dependency order. Steps 1-3 are additive and keep the suite green; 4-5 are the removal.

- [ ] 1. **[RED first]** `task get-new-uid [--count n]` - new verb. `ulid` is already a dependency. Exists so a batch-writing agent gets real ULIDs (timestamp prefix is load-bearing for the merge procedure at `file-format.md:126`). Failing test written and OBSERVED FAILING before implementation
- [ ] 2. **[RED first]** Integrity verb - **its own verb, NOT folded into `reindex`** (user ruled). Reports: schema-invalid files, dangling `depends_on` targets, and dep cycles. Reuse `hasCycle` (`mutate.mjs:141-144`), which needs exporting - it is module-private today. Failure is exit 4 (domain violation), already allocated: do NOT invent a new code (C-09, and exit 7 has history from the 0004 revert). One failing test per reported condition, each observed failing first
- [ ] 3. **[assertions unchanged]** `seed(dir, [...])` test helper that writes task YAML directly, then migrate the 17 fixtures off `import`. If any migrated fixture needs its assertions edited to pass, STOP and report - `seed()` is not reproducing what `import` produced
- [ ] 4. **[prose, no gate]** `/planning-tasks` Step 6 writes `.tasks/NNN-slug.yaml` files directly, allocating id/prefix/uid itself, then runs the integrity verb before declaring planning done
- [ ] 5. **[RED first for behaviour changes]** Delete `cmdImport` (`create.mjs:64-155`), `validateBatch` + `detectLabelCycles` (`schema.mjs:91-162`), the batch schema and the label indirection. Then the doc pass: `cli-reference.md`, `integration-contract.md`, `exit-codes.md` (3 lines), `SKILL.md`, `README.md`, `MAINTENANCE.md`, and `file-format.md` which must GAIN the id/prefix/uid allocation rules that live only in `create.mjs` today

**Gate on every one of steps 1, 2 and 5: no implementation line is written before a test that
covers it has been run and seen to fail for the right reason. Suite green before the step is
closed. A step that skips this is not done, regardless of whether the code works.**

### What's Next

**Every code change next session is TDD. This is a blocking gate, not a preference.**

The project convention for this repo, applied per `/planning-tasks` § The TDD gate: `managing-tasks/lib/**` is production code, policy `tdd`. Each of steps 1, 2 and 5 above:

1. Write the failing test FIRST, in `tests/`, and RUN it. A test that has never been observed failing is not a RED step - it may be asserting nothing.
2. Only then write the implementation.
3. Re-run; the suite must be 42+/42+ green before the step is called done.

Step 3 (the `seed()` helper) inverts: it is test infrastructure, so the gate on it is that all 17 migrated fixtures still pass unchanged assertions. If migrating a fixture forces an assertion change, STOP - that means `seed()` is not reproducing what `import` produced, and the test was silently weakened. This is the single riskiest step in the plan.

Step 4 is prose, no gate.

Do not batch steps. Each lands green before the next starts, because step 5 deletes the safety net the earlier steps built.

Suggested order within a step: RED test -> run, see it fail for the RIGHT reason (read the failure message, do not just check it is non-zero) -> implement -> green.

### Failed Approaches

No task tracker in this repo, so these live here. Nothing was abandoned this session, but one claim of mine was wrong in a way worth not repeating:

- **Reasoning about what a code change would break, from the docs rather than the code.** I told the user that dropping `task import` would lose dependency cycle detection. The opposite is true: `hasCycle` already walks the real repo-wide id graph (`mutate.mjs:141-144`), while `detectLabelCycles` only ever saw intra-batch label edges, so import cannot today catch a cycle routed through an existing task. I also asserted a ULID-generation problem that does not exist - `uid` has no format validation at all (`schema.mjs:25` is `requireString`). Both were caught by the user pushing back, not by me. Read the function before claiming what its removal costs

### Open Questions (session-scoped)

- Q-07 from 0003 is still unanswered and still the only open question about shipped code: `task show` renders `context[]` as a YAML key rather than the human `Context:` block spec R2 asked for. Reasoning is C-10. Not raised with the user this session either
- Q-04 from 0002 (splitting the 5a `Dependencies` checklist row into presence vs content) untouched for a third session

### Uncommitted Changes

Six modified files, all docs, all listed under What's Done. Nothing staged, no stash. HEAD is still `a261f34`.

Standing instruction from 0003, still in force: commit only once the skill is confirmed ready to use. Ask before committing.

### Docs That Will Need Reading

- `/writing-llm-document` - before editing any skill prose. Applies to step 5's doc pass and step 4
- `/testing-code` - before writing the RED tests in steps 1-3
- `managing-tasks/references/exit-codes.md` - MUST read before touching any exit code (C-09; the contract explicitly forbids domain errors falling back to 1)
- `managing-tasks/references/integration-contract.md` - it is now the single source of truth, so every shape change in step 5 lands there first and the other docs point at it
- `context/session_states/COMMON.md` - C-13, C-14 and D-13 bound what may be built inside `managing-tasks`. The integrity verb is schema-invariant checking and is IN scope; anything that starts enforcing methodology is not

### Docs That May Need Updating

- `managing-tasks/README.md` - the one doc in the skill that never mentions `kind` or `context[]` at all; still routes handoff to the deleted `/preserving-session-memory` (lines 9, 188, 209) and hardcodes `~/.claude/skills` (line 18) where SKILL.md now says `${skills_dir}`. Deliberately untouched: user-facing content decision, not a repair
- `managing-tasks/references/file-format.md` - `:145` says "Safe to hand-edit", which is only true for leaf fields. Hand-editing `depends_on` leaves `depends_on_uids` stale, and `:126` rewrites `depends_on` FROM that stale mirror at the next merge conflict. Needs a carve-out regardless of whether the import work lands

### Retrieval Hints

- the parked idea: merging `managing-tasks` + `planning-tasks` into one skill, working name **kanban**, with planning/execution modes shaped like this skill's onboard/offboard. User said "something for future me to consider" - grep `kanban`
- the import-removal design: grep `get-new-uid`, `seed(`, `detectLabelCycles`, `depends_on_labels`, `label_map`
- `task next` emits ` kind:<domain>` and nothing for `context[]` (`cli-reference.md:86`) - the field that cannot be reconstructed from project config is the one the "what now" command hides. Worked around in prose; the real fix is in `next`
- 17 of 42 tests use `import` as a fixture builder: `awk '/^test\(/{n=$0} /runCLI\(.*"import"/{print n}' tests/*.mjs | sort -u`
