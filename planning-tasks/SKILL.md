---
name: planning-tasks
description: Use when starting a complex feature (6+ steps), a multi-file change that needs architectural decisions, or when the user asks to plan before implementing. Also use when the user says "let's plan", "design this first", or "how should we approach this". Do not use for simple 1-2 step changes.
---

# Planning Feature Work

## Overview

Plan first, build second. The planning model researches the codebase, settles design decisions, writes the PRD and creates the tasks. Write it so the executor needs nothing but the PRD and the task list — no codebase exploration, no design decisions, no context docs.

## Workflow

### 1. Clarify Scope with User

Understand what the user wants, what they don't want, and what's ambiguous. A discussion, not a survey.

Things to explore naturally:

- What problem are we solving? What does "done" look like?
- What's in scope vs explicitly out of scope?
- Are there existing patterns to follow or avoid?
- Design/UX preferences (if frontend work involved)
- Testing expectations

Don't force answers. If the user says "just do X," that's enough context for X.

### 2. Research the Codebase

Understand the current state before planning changes.

**Few files (< 5):** Read them directly.

**Broad scan (many files, unclear structure):** Dispatch a read-only Explore subagent through the active host's native subagent mechanism. Give it this prompt:

```text
Read the project structure doc first, if one exists. Then find [what you need].
Report exact paths, symbols, and evidence. Do not edit files.
```

If the project instructions reference a structure doc (e.g., `FILE_STRUCTURE.md`), tell the subagent to read it first. Use a model capable of nuanced codebase research.

**If research reveals the feature already exists** (fully or partially), surface this to the user before continuing. Don't write a PRD for existing code.

**What to capture from research:**

- Exact file paths and function signatures of code you'll modify
- Existing patterns the new code should follow (reference specific files)
- Available fixtures, helpers, utilities to reuse
- Current state of the UI if frontend work (read templates + components)

### 3. Design Decisions

Settle all architectural and design questions in this phase. The executor should not be inventing:

- API endpoint shape (URL, method, request/response schema)
- Database query approach
- Component structure and state
- HTML layout and testability attributes (e.g., data-testid names) — these must be decided at design time, not left to the implementer

If the project instructions reference a style guide or design skill, read/use them here and capture the result in the PRD. If no style guide exists, follow standard language/framework conventions and note your choices in the PRD.

**Complex logic:** Use pseudocode to convey ideas when the approach isn't obvious. Don't dictate every line — the executor needs room to adapt when reality differs from the plan.

### 4. Write the PRD

See `references/prd-template.md` for the full template with examples.

**Where to save:** Check the project instructions first for a canonical PRD path. Default: `context/prd-<feature-name>.md` — create the `context/` directory if it doesn't exist.

### 5. Review the Plan

Two passes, different failure modes.

#### 5a. Completeness Review (native subagent)

Catches document-QA issues: TODOs, vague paths, missing signatures, untestable cases. See `references/plan-reviewer-prompt.md`.

**Loop:**

1. Dispatch reviewer with path to PRD
2. If issues found: fix them, re-dispatch
3. If approved: proceed to 5b
4. Max 3 iterations — if still failing, surface to user

Same agent that wrote the plan fixes it (preserves context).

#### 5b. Adversarial Review (opposite provider, multi-round)

Catches idea-level flaws: unvalidated assumptions, missing failure modes, scope bugs. See `references/adversarial-reviewer-prompt.md`.

**Preconditions:**

- PRD passed 5a
- PRD contains Context Primer, Breadth Checklist, Key Assumptions, Known Risks sections

**Loop:**

1. Invoke the opposite-provider CLI with the full PRD text, using the host branch in `references/adversarial-reviewer-prompt.md`. Record the provider, session id, model when reported, and repo HEAD at pass start.
2. The adversarial reviewer emits bundled, numbered findings plus any questions.
3. Verify before triaging. The reviewer receives only the supplied PRD and is instructed not to inspect the repository, while the PRD's citations may be stale. Spot-check each quoted path, symbol, and line against the tree. Reject a finding built on a stale citation and fix the citation.
4. Stop. Present findings to the user alongside any defects the primary agent found in the same pass. Self-disclosure is part of the round, not a favour.
5. User decides: continue, stop, or update PRD now
6. If continue: consolidate the PRD per 5c, re-run the scoped 5a, then draft an open-minded rebuttal and resume the explicit opposite-provider session per `references/adversarial-reviewer-prompt.md`.
7. Repeat from step 2 until user stops

No round cap. User judges.

**Scope each round at the previous round's new text.** A fix written into the PRD is unreviewed prose. Tell the adversarial reviewer where the new text is.

**Resume mechanics:** always use the explicit session id. Follow the provider-specific command and id-verification rules in `references/adversarial-reviewer-prompt.md`.

**Primary agent's role:** attorney, not postman. Be open-minded, agree when sensible, and push back with evidence when not. If the reviewer asks a codebase question, the primary agent reads and answers.

**After user stops:** the primary agent summarizes standing findings into conceded / disputed / accepted-risk and updates the PRD per the user's rulings.

#### 5c. Consolidate the PRD After Each Round

The PRD states the current design. It is not a changelog of how that design was reached.

After the user rules on a round's findings, edit the affected sections in place. Never append.

BAD, accumulates:

> Feature X. Round 1 found issue Y, fixed by Z. Round 2 found A; accepted fix B.

GOOD, consolidates:

> Feature X. Design: B. B is required because \<invariant\>; without it, \<concrete failure\>.

**Stays in the requirement:**

- The current design.
- Rationale for any constraint that looks removable but is not. Test: could a competent implementer delete this clause as an obvious simplification without realising what breaks? If yes, keep one line naming the invariant and the concrete failure, not the round that found it.

**Leaves the requirement**, moving to the decision record:

- Superseded designs, and the narrative of how the current one was reached
- Rejected alternatives and the user's rulings
- Round numbers, finding ids, reviewer names, session ids

**Consolidation discipline.** Rewriting is how new defects enter, so consolidate narrowly:

- Patch the smallest coherent block. Do not redraft a section to fix one clause.
- Keep requirement ids stable, so an accidental deletion is visible.
- Re-run 5a, scoped to the edited sections plus everything citing them, before firing the next 5b round. An internal contradiction is not worth an adversarial round.

##### The Decision Record

Sibling file: `context/prd-<feature>-decisions.md`. One entry per settled decision:

- **Decision** - what was ruled
- **Rationale** - why, in the present tense
- **Status** - accepted | rejected | accepted-risk
- **Scope** - where it applies
- **Reopen only if** - the evidence that would justify revisiting it. Name evidence, not "do not re-litigate"

Send 5b the PRD plus this register. Never the deliberation transcript - it anchors the reviewer on designs that no longer exist.

### 6. Create Tasks

**If the user opts out of task creation, or `.tasks/` is absent and the user does not want managing-tasks enabled:** The PRD with its file list and test plan is the deliverable. Skip the rest of this section.

Otherwise, write one task file per task into `.tasks/` from the PRD's Implementation Details section, then run `task verify`.

**Per-task quality gates (enforce before submit):**

- `title` — imperative, specific, one line
- `goal` — one sentence answering "what capability does this add"
- `files` — ≥1 entry, each with `path`, `kind` (`create`|`modify`|`delete`), and ≥1 `changes` bullet
- `tests` - required for any task that writes production code, unless its layer's convention is `tests-after` or `none` (see the TDD gate below). Otherwise, at least one of `tests` OR `notes` populated
- **TDD shape** - blocking. See below
- `sources` — ≥1 entry pointing back to the PRD (e.g., `kind: prd, ref: context/prd-X.md#section-name`)
- `context` - optional. What the executor must read or activate *beyond* what the task's `kind` resolves to. Each entry is `kind` (`file`|`skill`|`doc`), `ref`, one-clause `why`. Anything identical on every task of the layer goes in the project's task-kinds table instead
- `kind` — optional but encouraged. The task's skill-domain (`coding`, `testing`, `docs`, `infra`), taken from the project's task-kinds table vocabulary; omit if the project defines no table. For a task that writes both code and its tests, use the dominant domain (usually `coding`). Not to be confused with `subtasks[].kind` (RED/GREEN phase)

**The TDD gate (blocking):**

When breaking down tasks, take the project's testing conventions into account. They are normally written in the project instructions, and they decide this gate. A useful shape, if the project has not already declared one:

| Layer               | Policy         |
| ------------------- | -------------- |
| backend, api        | tdd            |
| frontend components | tests-required |
| e2e                 | tests-after    |
| docs, infra         | none           |

- `tdd` - a RED subtask ordered before a GREEN subtask. Test-first is mandatory. Encode the phase as `subtasks[].kind`; each subtask carries its own `status`.
- `tests-required` - tests ship in the same task, ordering not mandated. Fits frontend behaviour, where state transitions and error states are specifiable in advance but layout is discovered while building.
- `tests-after` / `none` - no test subtask required. E2E normally lands here; follow whatever the project says.

**Determine which tasks the gate applies to from `files[]`, not from a judgement call.** A task whose `files[]` include production code paths is in scope. Do not let the breakdown assert its own exemption.

**Every in-scope task satisfies exactly one of:**

- **a.** RED/GREEN subtasks in the same task, RED ordered before GREEN (policy `tdd`)
- **b.** a `tests[]` list naming the cases, in the same task (policy `tests-required`)
- **c.** a `notes` entry naming the deviation and why, where the task departs from its layer's declared convention. Prefix it `test-exempt:` so it is greppable and conspicuous in review

Silence is not option (c). A production-code task with no subtasks, no `tests[]` and no stated deviation fails the gate and is not submitted.

**If the project declares no testing convention, ask the user once** before writing the task files, and offer to write the answer into the project instructions. Do not silently default in either direction.

**Granularity rules:**

- Split any task that touches 3+ files AND has >5 total change bullets.
- Split per subsystem when a PRD section spans backend/frontend/tests/infra — one task per subsystem.

**Dependency derivation rules:**

- If task A creates a file task B references, B `depends_on: [A]`.
- If task A's backend work must land before task B's frontend consumes it, B depends on A.
- Under a `tdd` policy, tests come FIRST. Keep them as RED/GREEN subtasks inside one task, which order by position rather than by deps. Do not split the failing test into its own task that the coding task depends on: that task can never reach `done`, because its test is meant to stay red until the next task lands.
- Under `tests-after`, a separate test task may depend on the production task. Never under `tdd` - a test task depending on production code is test-after by construction.
- No implicit "last-added-depends-on-previous" chain. Every dep is explicit and reason-backed.

**Task file format & submission:**

Write one `.tasks/NNN-<slug>.yaml` file per task, directly. Full schema, envelope formats, and allocation rules for `id`, `NNN`, and `uid`: `../managing-tasks/references/integration-contract.md` - that file is authoritative. `references/managing-tasks-integration.md` carries only this skill's per-task quality checklist.

Get `uid` values from `task get-new-uid --count <n>`. Never hand-write one.

Resolve `depends_on` to real task ids as you write: a dep is the id of a task that already exists or that this run is creating.

Present the written tasks to the user for review - show the computed dep graph, plus a TDD compliance summary so a cheap exemption is conspicuous rather than buried. Derive it by counting the tasks you just wrote:

```
Production-code tasks: 14
  RED/GREEN (tdd):             11
  tests[] (tests-required):     2
  Deviations needing approval:  1
    - add-session-guard: test-exempt: migration-only, verified by alembic check
```

A task in none of those three buckets is a gate failure, not a fourth bucket. Fix it before presenting.

User may edit the files before you verify.

**Planning is not done until `task verify` exits 0.** Run it after writing the files:

- Exit 0: planning done.
- Exit 4: fix the files named in `problems[]` and re-run. Direct writes are not atomic, so fix forward - there is nothing to roll back.

Problem kinds and per-exit-code handling: the contract's § Producer-side patterns.

Example TDD subtask split inside a task file:

```yaml
  title: Add POST /rules endpoint
  goal: Expose rule creation to clients.
  files:
    - path: backend/routers/rules.py
      kind: create
      changes: [add create_rule handler returning 201]
  subtasks:
    - id: "1.1"
      kind: RED
      status: pending
      title: failing test for create_rule returning 201 with new ID
    - id: "1.2"
      kind: GREEN
      status: pending
      title: implement create_rule handler
  sources:
    - kind: prd
      ref: context/prd-rules.md#implementation-details-backend
```

## What Makes a Good Plan

- Executor can start task 1 without reading any context doc other than the PRD
- Every requirement names its dependencies explicitly. It may cite the Context Primer, Key Assumptions or another requirement by anchor, but a reader must never discover a behaviour by reading review history or an unrelated requirement
- Do not inline a shared rule into several requirements to make each self-contained. Duplicated rules diverge. Cite the single normative statement instead
- File paths are project-relative, never "the file" or "the test"
- Function signatures include types, not just names
- Test cases are enumerated, not "add appropriate tests"
- Ambiguity is resolved in the PRD, not left for the executor to figure out
