---
id: 0011
slug: global-working-modes
started: 2026-09-12
finalized: true
branch: master
head: 05d57c5
tasks: []
topics: [skill-repository, journaling-session-memory, orchestrating-agents, reviewing-code, remoting-git]
---

# Session 0011 - global-working-modes

## Log

- decision: `GLOBAL_CLAUDE.md` defines autopilot and manual steering modes. Autopilot follows a defined goal until done. Manual steering remains the default.
- decision: Add only the requested mode split before presenting any optional rules for user review.
- done: `GLOBAL_CLAUDE.md` - added the requested autopilot and default manual steering mode definitions.
- decision: Checkpoint only when the current user-authorized goal, a top-level tracker task, or an explicit pre-work assignment finishes. Otherwise write the journal only during offboard; agent-created steps never qualify.
- discovered: `orchestrating-agents` and `reviewing-code` contained mid-task checkpoint instructions that bypassed the journal skill's trigger list.
- done: `journaling-session-memory/`, `orchestrating-agents/SKILL.md`, and `reviewing-code/SKILL.md` - aligned journal and COMMON writes with task/goal completion or offboard while keeping tracker writes immediate.
- done: skill validation, stale-trigger scan, `git diff --check`, and independent adversarial review completed; onboarding setup remains separate from checkpoint cadence.
- done: `journaling-session-memory/SKILL.md` - required meaning-first C/D/Q references in direct user communication, with approved bad/good examples.
- done: `managing-git-remote/` -> `remoting-git/` - renamed the skill directory, frontmatter identity, heading, and project configuration key; preserved both workflow references.
- done: `remoting-git` skill validation and live-reference scan passed; the old name remains only in historical session evidence.
- discovered: `.agents-claude/` contains six Claude definitions; repository `.agents/` and `.codex/` are empty, so Codex has no local file-for-file equivalents. The high/max allrounders differ only by metadata and effort.
- correction: the duplicate “Reset after completion” autopilot item was removed before commit; “Handle small uncertainties” is item 2.
- done: committed global modes as `2c90282`, checkpoint simplification as `028840e`, and the remote skill rename as `05d57c5`.

## Handoff

### Work

- [x] `GLOBAL_CLAUDE.md`: added manual and autopilot modes; removed the duplicate autopilot item; committed as `2c90282`
- [x] `journaling-session-memory/`: reduced checkpoint cadence to completed user goals, top-level tasks, explicit pre-work assignments, and offboard; added meaning-first anchors; committed as `028840e`
- [x] `orchestrating-agents/SKILL.md`, `reviewing-code/SKILL.md`: removed consumer-side mid-task checkpoint behavior in `028840e`
- [x] `managing-git-remote/` -> `remoting-git/`: renamed skill, identity, and configuration key; committed as `05d57c5`
- [x] `.agents-claude/`: compared six Claude definitions with current Codex subagents and official OpenAI agent configuration; no files changed

### Next

1. Push the four session commits when ready.
2. After they reach the remote, update the read-only Codex mirror through Git.

### State

- tree: content changes committed through `05d57c5`; final context commit contains `COMMON.md` and this amended session file
- load: `writing-llm-document`, `skill-creator`, `journaling-session-memory`
- retrieve: checkpoint cadence, Human-Facing References, remoting-git rename, `.agents-claude/`, empty `.agents/` and `.codex/`
