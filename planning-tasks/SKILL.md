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

**Where to save:** Check the project's CLAUDE.md first for a canonical PRD path. If none specified:
- If `.taskmaster/` exists: `.taskmaster/docs/prd-<feature-name>.md`
- Otherwise: `context/prd-<feature-name>.md` — create the `context/` directory if it doesn't exist

### 5. Review the Plan

Before presenting to the user, dispatch a reviewer subagent to catch gaps. See `references/plan-reviewer-prompt.md` for the reviewer prompt.

**Review loop:**
1. Dispatch reviewer with path to PRD
2. If issues found: fix them, re-dispatch reviewer
3. If approved: present to user
4. Max 3 iterations — if still failing, surface issues to user for guidance

The same agent that wrote the plan fixes it (preserves context).

### 6. Create Tasks

**If no taskmaster, or user opts out of task creation:** The PRD with its file list and test plan is the deliverable. Skip the rest of this section.

**If `.taskmaster/` exists:** Create tasks directly using `add_task` — do NOT use `parse_prd` (its LLM generates vague tasks; you have the full context and should create precise tasks yourself).

**Task detail level:**

Each task should tell the executor exactly what to do:

- Which files to create/modify
- Function signatures (name, args, return type)
- Test cases to write (input -> expected output)
- Which existing code to reference as a pattern

**Task granularity:** Flexible — match the natural units of work. A schema file + its tests might be one task. A complex endpoint might be two (tests first, then implementation). Use judgment.

**Dependencies:** Set them so the executor can pick up tasks in order without asking "what do I do first?"

**TDD:** If the project follows TDD (check CLAUDE.md or testing docs), add subtasks for the red-green cycle where applicable. TDD subtask splits apply to unit, API, integration, and component tests — NOT to E2E tests (which need a running app/real DOM before assertions can be written).

Example TDD subtask split:
- Subtask 1 (RED): Write failing test for `create_rule()` — expected status 201, returns rule with ID
- Subtask 2 (GREEN): Implement `create_rule()` endpoint to pass the test

## What Makes a Good Plan

- Executor can start task 1 without reading any context doc other than the PRD
- File paths are project-relative, never "the file" or "the test"
- Function signatures include types, not just names
- Test cases are enumerated, not "add appropriate tests"
- Ambiguity is resolved in the PRD, not left for the executor to figure out
