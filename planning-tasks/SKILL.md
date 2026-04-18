---
name: planning-tasks
description: Use when starting a complex feature (6+ steps), a multi-file change that needs architectural decisions, or when the user asks to plan before implementing. Also use when the user says "let's plan", "design this first", or "how should we approach this". Do not use for simple 1-2 step changes.
---

# Planning Feature Work

## Overview

Plan first, build second. The planning model does the thinking — researching the codebase, making design decisions, writing a detailed PRD, and creating tasks. The executing model (or a subagent) follows the plan without re-reading the codebase or inventing architecture.

The plan must be detailed enough that the executor only needs the PRD and task list — not explore the codebase, not make design decisions, not re-read context docs.

## Workflow

### 1. Clarify Scope with User

Have a conversation. Understand what the user wants, what they don't want, and what's ambiguous. This is a discussion, not a survey — adapt to what the user shares.

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

**Broad scan (many files, unclear structure):** Use the Agent tool to spawn an Explore subagent:

```
Agent(
  subagent_type: "Explore",
  model: "sonnet",
  prompt: "Read the project structure doc first (if one exists) for codebase layout.
  Then find [what you need]..."
)
```

If the project's CLAUDE.md references a structure doc (e.g., FILE_STRUCTURE.md), tell the agent to read it first. Never spawn Haiku for research — it misses nuance.

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

If the project's CLAUDE.md references a style guide or design skill, read/use them here and capture the result in the PRD. If no style guide exists, follow standard language/framework conventions and note your choices in the PRD.

**Complex logic:** Use pseudocode to convey ideas when the approach isn't obvious. Don't dictate every line — the executor needs room to adapt when reality differs from the plan.

### 4. Write the PRD

See `references/prd-template.md` for the full template with examples.

**Where to save:** Check the project's CLAUDE.md first for a canonical PRD path. Default: `context/prd-<feature-name>.md` — create the `context/` directory if it doesn't exist.

### 5. Review the Plan

Two passes, different failure modes.

#### 5a. Completeness Review (Claude subagent)

Catches document-QA issues: TODOs, vague paths, missing signatures, untestable cases. See `references/plan-reviewer-prompt.md`.

**Loop:**
1. Dispatch reviewer with path to PRD
2. If issues found: fix them, re-dispatch
3. If approved: proceed to 5b
4. Max 3 iterations — if still failing, surface to user

Same agent that wrote the plan fixes it (preserves context).

#### 5b. Adversarial Review (Codex, multi-round)

Catches idea-level flaws: unvalidated assumptions, missing failure modes, scope bugs. See `references/adversarial-reviewer-prompt.md`.

**Preconditions:**
- PRD passed 5a
- PRD contains Context Primer, Breadth Checklist, Key Assumptions, Known Risks sections

**Loop:**
1. Claude invokes Codex via companion `task` with full PRD text
2. Codex emits findings (bundled, numbered) plus any questions
3. Stop. Present findings to user.
4. User decides: continue, stop, or update PRD now
5. If continue: Claude drafts open-minded rebuttal (concede where valid, push back with codebase evidence), sends via `task --resume-last`
6. Repeat from step 2 until user stops

No round cap. User judges.

**Claude's role:** attorney, not postman. Open-minded — agree when sensible, push back with evidence when not. No performative agreement, no fake politeness. If Codex asks a codebase question, Claude reads and answers.

**After user stops:** Claude summarizes standing findings into conceded / disputed / accepted-risk. Updates PRD per user's rulings.

### 6. Create Tasks

**If the user opts out of task creation, or `.tasks/` is absent and the user does not want `/managing-tasks` enabled:** The PRD with its file list and test plan is the deliverable. Skip the rest of this section.

Otherwise, build a batch-import YAML from the PRD's Implementation Details section and submit it via `task import`.

**Per-task quality gates (enforce before submit):**

- `title` — imperative, specific, one line
- `goal` — one sentence answering "what capability does this add"
- `files` — ≥1 entry, each with `path`, `kind` (`create`|`modify`|`delete`), and ≥1 `changes` bullet
- At least one of `tests` OR `notes` populated
- `sources` — ≥1 entry pointing back to the PRD (e.g., `kind: prd, ref: context/prd-X.md#section-name`)

**Granularity rules:**

- Split any task that touches 3+ files AND has >5 total change bullets.
- Split per subsystem when a PRD section spans backend/frontend/tests/infra — one task per subsystem.
- TDD RED/GREEN split applies to unit, API, integration, and component tests — NOT E2E. Encode RED/GREEN as `subtasks[].kind` labels; each subtask carries its own `status`.

**Dependency derivation rules:**

- If task A creates a file task B references, B `depends_on: [A]`.
- If task A's backend work must land before task B's frontend consumes it, B depends on A.
- Tests depending on production code: add a dep (or use TDD RED/GREEN subtasks, which use ordering, not deps).
- No implicit "last-added-depends-on-previous" chain. Every dep is explicit and reason-backed.

**Batch file format & submission:**

Write to `.tasks/.import-<feature-slug>.yaml`. Full schema and example: `references/managing-tasks-integration.md`.

Present the batch to the user for review — show the computed dep graph. User may edit the file before submitting.

Submit with: `task import .tasks/.import-<feature-slug>.yaml`. Consume the returned `label_map` for any downstream references. Delete the batch file on success.

On failure, the CLI creates zero tasks (atomic rollback). Read the stderr message, fix the batch, resubmit.

Example TDD subtask split inside the batch:

```yaml
- label: rule-ep
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
- File paths are project-relative, never "the file" or "the test"
- Function signatures include types, not just names
- Test cases are enumerated, not "add appropriate tests"
- Ambiguity is resolved in the PRD, not left for the executor to figure out
