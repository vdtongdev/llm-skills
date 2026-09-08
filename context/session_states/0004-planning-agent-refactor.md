---
id: 0004
slug: planning-agent-refactor
started: 2026-09-08
finalized: false
branch: master
head:
tasks: []
topics: [planning-tasks, orchestrating-agents]
---

# Session 0004 - planning-agent-refactor

## Log

- discovered: recovered work after session 0003 added a task-writer agent, planner prompt templates, and further planning-tasks delegation changes without a session record.
- decision: custom agents are standalone capabilities. Agent definitions own stable behavior; invoking skills steer each use; orchestrating-agents selects and verifies context by agent type and mode.
- decision: planner remains read-only and plan-only. It supports design proposals, peer plan review, completeness review, and adversarial plan review. Code and pull-request review will use a separate future reviewer.
- decision: keep planner proposals message-based until real workflow tests justify writable artifacts.
- decision: move personal Claude agent definitions into this repository at `.agents-claude/`; `~/.claude/agents` becomes a symlink to that tracked directory.
- done: `.agents-claude/` - moved discoverer, planner, and task-writer into the repository; `~/.claude/agents` now resolves through the requested symlink.
- done: `.agents-claude/planner.md` and `.agents-claude/task-writer.md` - made capabilities standalone, corrected `skills:` frontmatter, separated planner output by mode, and removed duplicated task policy.
- mellaug
- correction: previous `mellaug` Log entry has no meaning and was added by an editing error; ignore it.
- done: `planning-tasks/` - linked planner prompt templates, selected explicit planner modes, and passed absolute task contract paths.
- done: `orchestrating-agents/SKILL.md` - added context routing by standalone agent type and mode; planning agents remain outside implementation-worker gates.
- done: `README.md` - documented the tracked `.agents-claude/` directory and `~/.claude/agents` link.
- decision: defer Codex dispatch parity. Keep current Claude `Agent` and `SendMessage` mechanics until Codex alternatives are researched.
- discovered: independent review found five other contract gaps: caller coupling, no review agent after planner skip, late decision-record creation, task-writer ownership conflict, and inconsistent review statuses.
- done: independent adversarial re-review confirmed the actionable findings were resolved and no material contract defect was introduced.
- done: validation passed for planning-tasks, orchestrating-agents, all agent YAML frontmatter, local references, symlink target, and `git diff --check`.
- correction: session 0004 was finalized prematurely; user requested that it remain active while the agent preload design is reviewed.
- decision: host adaptation stays capability-based. Use native agent tools; when cross-provider models are unavailable, use distinct available models and disclose the limitation.
- done: Q-01 resolved by the capability-based host adaptation rule; no host-specific Codex adapter is required now.
- done: `planning-tasks/SKILL.md` - added the concise host-adaptation rule approved by the user.
