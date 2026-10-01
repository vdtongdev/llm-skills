---
name: planning-tasks
description: Use when a task is complex enough that starting edits immediately risks getting lost - broad research, six or more steps, multi-file design decisions, or work spanning sessions. Also use when the user says "let's plan", "design this first", or "how should we approach this". Do not use for 1-2 step changes.
---

# Planning Tasks

Planning is a working technique, not an approval ceremony. Research, write a short plan in the repository, then execute it. The plan file carries the work across sessions.

## Workflow

### 1. Scope

State the goal and what "done" means. Ask only when an ambiguity would change the outcome.

### 2. Research

- Read the structure, style, and testing docs that project instructions name for `planning-tasks`.
- Read the affected code directly. For broad scans, dispatch a `discoverer` agent with a search focus; fall back to `Explore`.
- Search for existing functions, utilities, and patterns before proposing new code. Reuse them.
- If the project has `.antipatterns/`, recall records for the affected topics and paths with `antipatterning`.
- If the feature already exists fully or partially, tell the user before planning further.

### 3. Decide

Settle reversible choices yourself from repository evidence. Ask the user only about preference, scope, irreversible changes, or risk acceptance.

### 4. Write the Plan

Write the plan from `references/plan-template.md` to `context/plans/<feature>.md`, unless project instructions name another path. Create the folder when absent.

### 5. Review When Risky

Send the plan to a `reviewer` agent when you judge the work complex, likely suboptimal, or likely to break existing behavior. Otherwise skip review. Give the reviewer the plan path, the code paths it may cite, and the risks you want tested.

Reviewer findings are advice. Verify each against the repository, fix the plan for confirmed defects, and escalate only material design questions to the user. Run one round unless the plan changes materially.

### 6. Approval

Follow the active working mode from the global instructions. Do not add an approval step of your own.

### 7. Create Tasks

Create `.tasks/` files only when work spans sessions or goes to parallel workers. Write them yourself:

1. Read `~/.claude/skills/managing-tasks/references/integration-contract.md` for schema and submission.
2. Apply `references/managing-tasks-integration.md` for task quality and testing policy.
3. Run `~/.claude/skills/managing-tasks/bin/task verify` until it exits 0.

### 8. Keep the Plan Current

Tick steps as they finish. When reality differs from the plan, edit the affected section in place. The plan states the current design, not its history.

## Completion Gate

- [ ] Research covered reuse and, when `.antipatterns/` exists, antipattern recall.
- [ ] The plan exists at the resolved plan path and follows `references/plan-template.md`.
- [ ] A risky plan received one `reviewer` round, and each finding was verified before acting on it.
- [ ] When tasks were created, `task verify` exited 0.
