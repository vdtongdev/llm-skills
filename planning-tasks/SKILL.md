---
name: planning-tasks
description: Use when starting a complex feature (6+ steps), a multi-file change that needs architectural decisions, or when the user asks to plan before implementing. Also use when the user says "let's plan", "design this first", or "how should we approach this". Do not use for simple 1-2 step changes.
---

# Planning Feature Work

## Overview

Plan first, build second. The main agent researches the codebase, settles design decisions, writes the PRD, and creates the tasks. Independent reviewers test the completed plan. Write it so the executor needs only the PRD and task list.

## Workflow

Use native agent tools for discovery and review. The main agent owns the design and PRD. Do not delegate competing plan generation.

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

**Few files (< 5):** Read directly.

**Broad scan (many files, unclear structure):** Dispatch one or more `discoverer` subagents with the `orchestrating-agents` context profile. Split by concern area when the scan spans multiple subsystems. Default to one agent.

Each agent receives a prompt naming its search focus and any structure doc the project instructions reference. The agent returns a structured report (existing patterns, reusable code, test fixtures, anti-pattern findings).

If the `discoverer` agent is not available, fall back to the built-in `Explore` agent.

**If research reveals the feature already exists** (fully or partially), surface this to the user before continuing. Don't write a PRD for existing code.

**Reuse is mandatory.** Search for existing functions, utilities, and patterns that serve the feature's needs. Do not propose new code when a suitable implementation already exists.

**Anti-pattern recall:** If the project has an anti-pattern registry (`.antipatterns/` or equivalent, via `antipatterning`), recall by topic and path for the feature's area before designing.

The main agent consolidates direct reads and subagent reports. Capture:

- Exact file paths and function signatures of code to modify
- Existing patterns the new code should follow (reference specific files)
- Reusable fixtures, helpers, and utilities found
- Current UI state if frontend work (templates, components)
- Anti-pattern findings

### 3. Design Decisions

The main agent settles the design before writing the PRD. Do not ask subagents to generate competing plans or exchange proposals.

When a material decision has several viable options:

1. Compare the options, sorted by simplicity.
2. Give concise pros and cons.
3. Recommend one from the user's stated intent and repository evidence.
4. Ask the user to rule when the choice depends on preference, scope, architecture, or accepted risk.

The executor should not be inventing:

- API endpoint shape (URL, method, request/response schema)
- Database query approach
- Component structure and state
- HTML layout and testability attributes (e.g., data-testid names)

If the project instructions reference a style guide or design skill, read/use them here and capture the result in the PRD. If no style guide exists, follow standard language/framework conventions and note your choices in the PRD.

**Complex logic:** Use pseudocode when the approach is not obvious. Do not dictate every line - the executor needs room to adapt when reality differs from the plan.

### 4. Write the PRD

See `references/prd-template.md` for the full template with examples.

**Where to save:** Check project instructions for a canonical PRD path. Default to `context/prd-<feature-name>.md`. Create `context/` when absent.

When §3 produces a user ruling or rejected alternative, create `<resolved-prd-path-without-.md>-decisions.md` before review. Record each settled choice with the decision fields in §5a. If §3 had no decision points, later review prompts state `Decision record: none`.

#### Present the Plan Summary

After finalizing the PRD and any decision record, present a user-facing summary before reviewer dispatch. Derive it from the PRD's Execution Order and Requirements. Do not create a separate summary file.

Use one numbered item per execution step:

1. **<Step name>: <intended outcome>**

   - Changes: <main behavior added or changed>
   - Files: <key files, components, or interfaces>
   - Tests: <verification for this step>
   - Depends on: <load-bearing dependency reason; omit when none>

Keep each item concise. State accepted risks once after the numbered steps. If the summary exposes a mismatch or unresolved decision, correct the PRD before review. Do not require separate approval when the summary matches the settled plan.

### 5. Review the Plan

Read `references/plan-review-methodology.md` before dispatch. Review starts only after the main agent finishes the PRD and any decision record.

Spawn two independent review agents in parallel. Use `plan-reviewer` when available. Otherwise use the host's read-only or general subagent with the same rubric. Prefer different providers or models. If only one reviewer is available, use it and disclose the limitation.

Give each reviewer only:

- mode: `Plan Review`
- one focus: `completeness and buildability` or `assumptions and failure modes`
- PRD path
- decision record path or `none`
- `references/plan-review-methodology.md`
- every `Ruled: <decision>, because <reason>` line
- code paths allowed for citation spot-checks

Reviewers read the artifacts from disk. Do not paste the PRD or one reviewer's output into another reviewer's prompt. Reviewers find defects; they do not write replacement plans.

After both return:

1. Verify each finding against the PRD and repository.
2. Deduplicate findings with the same cause.
3. Fix objective document defects within the accepted design.
4. Present material design findings, reviewer disagreements, questions, and self-found defects to the user.
5. Apply the user's rulings and consolidate the PRD per §5a.

Run one review round by default. Re-review only materially changed sections and their direct dependents, or continue when the user requests another round. Resume the same reviewers and pass paths plus changed section names, not copied artifacts.

#### 5a. Consolidate the PRD After Review

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
- Re-review edited sections and everything citing them after a material change.

##### The Decision Record

Sibling file: `context/prd-<feature>-decisions.md`. One entry per settled decision:

- **Decision** - what was ruled
- **Rationale** - why, in the present tense
- **Status** - accepted | rejected | accepted-risk
- **Scope** - where it applies
- **Reopen only if** - the evidence that would justify revisiting it. Name evidence, not "do not re-litigate"

Send reviewers the PRD plus this register. Never send the deliberation transcript. It anchors reviewers on designs that no longer exist.

### 6. Create Tasks

**If the user opts out of task creation, or `.tasks/` is absent and the user does not want managing-tasks enabled:** The PRD with its file list and test plan is the deliverable. Skip this section.

**Before spawning:** Resolve the project's testing conventions. Read the project instructions for a per-layer testing policy. If the project declares none, ask the user once and offer to write the answer into the project instructions. Do not silently default.

A useful default shape, if the project has not already declared one:

| Layer               | Policy         |
| ------------------- | -------------- |
| backend, api        | tdd            |
| frontend components | tests-required |
| e2e                 | tests-after    |
| docs, infra         | none           |

**Spawn the `task-writer` agent** with:

- Path to the PRD
- The resolved testing policy per layer
- Path to project instructions (if any)
- Task contract: `~/.claude/skills/managing-tasks/references/integration-contract.md`
- Quality checklist: `~/.claude/skills/planning-tasks/references/managing-tasks-integration.md`
- Canonical executable: `~/.claude/skills/managing-tasks/bin/task`
- Owned `.tasks/` paths and forbidden write paths

The agent reads the PRD and both contracts, writes `.tasks/` files, runs the canonical task executable, and reports the dependency graph and testing compliance summary. The quality checklist owns granularity, dependency, and testing rules. The task contract owns schema and submission rules.

**Planning is done when `~/.claude/skills/managing-tasks/bin/task verify` exits 0.**

## What Makes a Good Plan

- Executor can start task 1 without reading any context doc other than the PRD
- Every requirement names its dependencies explicitly. It may cite the Context Primer, Key Assumptions or another requirement by anchor, but a reader must never discover a behaviour by reading review history or an unrelated requirement
- Do not inline a shared rule into several requirements to make each self-contained. Duplicated rules diverge. Cite the single normative statement instead
- File paths are project-relative, never "the file" or "the test"
- Function signatures include types, not just names
- Test cases are enumerated, not "add appropriate tests"
- Ambiguity is resolved in the PRD, not left for the executor to figure out

## Completion Gate

- [ ] The main agent researched the codebase, settled the design, and wrote the PRD.
- [ ] The user received a step-by-step summary derived from the finalized PRD before reviewer dispatch.
- [ ] No subagent generated a competing plan or exchanged proposals with another reviewer.
- [ ] Two independent reviewers read the PRD from disk and returned concise findings without replacement plans, or the single-reviewer limitation was disclosed.
- [ ] Every accepted finding is reflected in the PRD; every rejected finding has repository evidence.
- [ ] User rulings and accepted risks appear in the decision record when one exists.
- [ ] Task files follow `references/managing-tasks-integration.md` and `task verify` exits 0 when task creation applies.
