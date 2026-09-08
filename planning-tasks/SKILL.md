---
name: planning-tasks
description: Use when starting a complex feature (6+ steps), a multi-file change that needs architectural decisions, or when the user asks to plan before implementing. Also use when the user says "let's plan", "design this first", or "how should we approach this". Do not use for simple 1-2 step changes.
---

# Planning Feature Work

## Overview

Plan first, build second. The planning model researches the codebase, settles design decisions, writes the PRD and creates the tasks. Write it so the executor needs nothing but the PRD and the task list — no codebase exploration, no design decisions, no context docs.

## Workflow

Use native agent tools. If cross-provider models are unavailable, use distinct available models and disclose the limitation.

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

**Write the exploration doc.** Consolidate all research (direct reads and subagent reports) into `context/exploration-<feature>.md`. This file is the single input for downstream planners in §3. Include:

- Exact file paths and function signatures of code to modify
- Existing patterns the new code should follow (reference specific files)
- Reusable fixtures, helpers, and utilities found
- Current UI state if frontend work (templates, components)
- Anti-pattern findings

### 3. Competing Designs

Generate at least two design proposals from different providers before settling decisions. A single designer shares its own blind spots. Cross-provider proposals surface different assumptions, tradeoffs, and failure modes at low cost.

**When to skip:** If §2 read fewer than 5 files and the design has no real decision points, the main agent settles the design directly. Do not spawn planners for a single-endpoint CRUD addition with no ambiguity.

#### 3a. Spawn planners

Read `references/planner-prompt-templates.md` before the first planner dispatch. Use its matching mode for every initial or follow-up prompt.

1. Choose 2-3 models from different providers in the host's subagent model list. Spawn each as a `planner` agent with a model override and the `orchestrating-agents` `planner/proposal` context profile.
2. Each planner receives in its prompt:
   - Path to the exploration doc from §2 (the planner reads it directly; do not re-serialize exploration into the prompt)
   - Path to the PRD template (`references/prd-template.md`)
   - The user's requirements from §1, summarized by the main agent
   - A design axis to emphasize (see below)
   - The list of decisions that must be settled (see below)
3. Launch all planners in parallel.

**Design axes** (assign one per planner, adapt to the task type):

- New feature: simplicity vs. performance vs. maintainability
- Bug fix: root cause vs. workaround vs. prevention
- Refactoring: minimal change vs. clean architecture

**Decisions that must be settled.** The executor should not be inventing:

- API endpoint shape (URL, method, request/response schema)
- Database query approach
- Component structure and state
- HTML layout and testability attributes (e.g., data-testid names)

Adapt this list to the project's domain.

If the project instructions reference a style guide or design skill, read/use them here and capture the result in the PRD. If no style guide exists, follow standard language/framework conventions and note your choices in the PRD.

**Complex logic:** Use pseudocode when the approach is not obvious. Do not dictate every line - the executor needs room to adapt when reality differs from the plan.

#### 3b. Resolve questions

After all planners return, collect their Questions sections. Answer what the main agent can answer from §1 context. Anything the main agent cannot answer satisfactorily, elevate to the user. Re-invoke each planner that had open questions with the answers, so they can update their proposals.

A planner may push back on an answer it finds unsatisfying and request user elevation. The main agent must comply.

#### 3c. Peer review (up to 3 rounds)

Planners review each other's proposals directly. The main agent orchestrates by passing proposals between them.

**Round flow:**

1. Send each planner the other planners' proposals in `Peer Review` mode. Paste the full proposal text because planners are read-only.
2. Collect reviews. Send each planner the critiques it received. The planner responds with Agree/Disagree/Questions and re-emits its proposal only when it changes.
3. Resolve new Questions through §3b. If no Disagree or Questions remain, or 3 rounds have passed, stop. Otherwise repeat from step 1 with updated proposals.

**Addressing planners:** Each parallel spawn gets a unique agent name (e.g., `planner-simplicity`, `planner-performance`). Use SendMessage to continue an existing planner across rounds rather than spawning fresh agents. This preserves context and avoids re-priming.

**Convergence:** Planners may concede points during review. Full agreement requires no `Disagree` or `Questions` items.

#### 3d. Disagreement report

After peer review ends, the main agent reads all final proposals and writes:

- **Agreements:** Where all planners converge, one merged statement.
- **Deltas:** Each standing disagreement itemized: the decision, each option with its reasoning, and the main agent's recommendation based on user intent from §1.

Present the report to the user. The user rules on each delta. Rulings (as "Ruled: [decision], because [reason]") feed §4 and any later planner re-invocations.

### 4. Write the PRD

See `references/prd-template.md` for the full template with examples.

**Where to save:** Check the project instructions first for a canonical PRD path. Default: `context/prd-<feature-name>.md` — create the `context/` directory if it doesn't exist.

When §3 produces a proposal choice or user ruling, create `<resolved-prd-path-without-.md>-decisions.md` before review. Record selected and rejected choices with the decision fields in §5c. If §3 had no decision points, later review prompts state `Decision record: none`.

### 5. Review the Plan

Reuse planner agents from §3. If §3 spawned none, spawn one `planner` with the `orchestrating-agents` `planner/plan review` context profile. Give a new reviewer the PRD, matching review rubric, decision record or `none`, and every `Ruled` line.

#### 5a. Completeness Review

Catches document-QA issues: TODOs, vague paths, missing signatures, untestable cases.

**Preconditions:** PRD contains Context Primer, Breadth Checklist, Key Assumptions, Known Risks sections.

**Loop:**

1. Send the PRD to each planner agent in `Plan Completeness Review` mode. Include all Ruled lines from §3d.
2. Collect reviews. If issues found: fix them in the PRD, re-send the updated sections.
3. If approved by all planners: proceed to 5b.
4. Max 3 iterations. If still failing, surface to user.

The main agent fixes the PRD. Re-send only the updated sections and their direct dependents.

#### 5b. Adversarial Review

Catches idea-level flaws: unvalidated assumptions, missing failure modes, scope bugs.

**Preconditions:** PRD passed 5a.

**Loop:**

1. Send the PRD plus the decision record to each planner agent in `Plan Adversarial Review` mode. Planners spot-check file paths and signatures against the tree.
2. Planners emit numbered findings and questions.
3. Main agent verifies findings against the codebase. Reject findings built on stale citations and fix the citations.
4. Present findings to the user alongside any defects the main agent found. Self-disclosure is part of the round, not a favour.
5. User decides: continue, stop, or update PRD now.
6. If continue: consolidate per 5c, re-run scoped 5a on edited sections, then re-send to planners with the new text marked.
7. Repeat from step 2 until user stops.

No round cap. User judges.

**Scope each round at the previous round's new text.** A fix written into the PRD is unreviewed prose. Tell planners where the new text is.

**Primary agent's role:** attorney, not postman. Be open-minded, agree when sensible, and push back with evidence when not. If a planner asks a codebase question, the main agent reads and answers.

**After user stops:** the main agent summarizes standing findings into conceded / disputed / accepted-risk and updates the PRD per the user's rulings.

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
