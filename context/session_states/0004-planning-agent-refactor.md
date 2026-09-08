---
id: 0004
slug: planning-agent-refactor
started: 2026-09-08
finalized: true
branch: master
head: facb629
tasks: []
topics: [planning-tasks, orchestrating-agents, skill-repository]
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
- done: commit `f41ac98` records the reviewed planning-agent renovation.
- decision: split shared host instructions from repository instructions. `GLOBAL_CLAUDE.md` owns shared behavior; `CLAUDE.md` owns this repository's workflow and writing rules.
- done: `CLAUDE.md`, `GLOBAL_CLAUDE.md`, and `README.md` - wrote the editable repo draft, preserved shared rules, and documented the split.
- done: `~/.claude/CLAUDE.md` - repointed the global Claude link to `~/.claude/skills/GLOBAL_CLAUDE.md`.
- discovered: `~/.agents/skills/GLOBAL_CLAUDE.md` does not exist before Git synchronization. Keep `~/.codex/AGENTS.md` on its working target until the draft is committed and mirrored.
- discovered: adversarial review found existing installations would lose Codex global rules after mirror synchronization unless `~/.codex/AGENTS.md` is repointed.
- done: `README.md` - added ordered migration steps for existing Claude and Codex instruction links.
- decision: create separate high-effort and maximum-effort general-purpose workers with identical behavior, inherited tools, and preloaded `antipatterning`.
- done: `.agents-claude/general-purpose-high.md` and `.agents-claude/general-purpose-max.md` - added bounded implementation workers that report possible antipattern additions instead of writing them without permission.
- decision: reviewer performs its own read-only discovery. Planner remains the preferred plan reviewer, but reviewer may inspect plans after confirming intentional routing.
- decision: `reviewing-code` owns code-review workflow; `reviewer` owns stable review behavior and routing. Direct reviews write journal checkpoints; delegated reviews return state proposals to the orchestrator.
- done: `.agents-claude/reviewer.md`, `reviewing-code/SKILL.md`, and `orchestrating-agents/SKILL.md` - added the general reviewer and aligned delegated review state ownership.
- decision: D-06 replaced by D-09 because the separate reviewer now exists and may review plans after explicit routing confirmation.
- discovered: independent review found mismatched delegated checkpoint cadence, unsupported standalone-code routing, undefined general-artifact severity, and missing D-06 replacement evidence.
- done: `.agents-claude/reviewer.md`, `reviewing-code/SKILL.md`, and `orchestrating-agents/SKILL.md` - aligned proposal timing, narrowed branch-only skill routing, and made generic severity rubric-owned.
- correction: D-09's earlier `reviewing-code` route was too broad. Only committed branch ranges and pull requests use the skill; standalone or uncommitted code uses general artifact review.
- done: focused adversarial re-review passed after all reviewer routing and state-ownership findings were corrected.
- done: validation parsed every Claude agent frontmatter, confirmed symlink visibility, and passed `git diff --check`.

## Handoff

### Work

- [x] `planning-tasks/`, `orchestrating-agents/`, and `.agents-claude/{discoverer,planner,task-writer}.md`: planning workflow delegated to standalone agents and committed.
- [x] `CLAUDE.md`, `GLOBAL_CLAUDE.md`, and `README.md`: repository and global instructions split, committed, and pushed as `facb629`.
- [ ] `.agents-claude/general-purpose-high.md` and `.agents-claude/general-purpose-max.md`: review and commit the new implementation workers.
- [ ] `.agents-claude/reviewer.md`, `reviewing-code/SKILL.md`, and `orchestrating-agents/SKILL.md`: review and commit the general reviewer integration.
- [ ] `context/session_states/COMMON.md` and this session file: commit their pending worker and reviewer decisions with the agent changes.
- [ ] `~/.agents/skills` and `~/.codex/AGENTS.md`: synchronize the next commit, then repoint Codex to `~/.agents/skills/GLOBAL_CLAUDE.md`.

### Next

1. Review the uncommitted worker, reviewer, and skill changes.
2. Commit and push the accepted files.
3. Pull `~/.agents/skills` with `--ff-only` and repoint `~/.codex/AGENTS.md` to `GLOBAL_CLAUDE.md`.

### State

- tree: dirty - four modified files and three untracked agent definitions
- load: `orchestrating-agents`, `reviewing-code`, `.agents-claude/reviewer.md`, `.agents-claude/general-purpose-high.md`, `.agents-claude/general-purpose-max.md`
- retrieve: D-08, D-09, `Review State Ownership`, `Route the Review`
