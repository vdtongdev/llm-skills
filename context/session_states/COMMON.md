---
budget_words: { target: 2000, hard: 3500 }
---

# Common Knowledge

## Constraints

## Decisions

- D-05: Custom agents own reusable behavior; invoking skills steer each use; orchestrating-agents supplies context by agent type and mode. (0004)
- D-07: Shared host instructions live in `GLOBAL_CLAUDE.md`; repo instructions live in `CLAUDE.md`, with tracked `AGENTS.md -> CLAUDE.md`. Global host links must target `GLOBAL_CLAUDE.md`. (0004)
- D-08: General-purpose workers use identical bodies with inherited tools and preloaded `antipatterning`; separate high/max definitions select effort. Workers propose new antipatterns but never record them without permission. (0004)
- D-21: No dedicated plan reviewer or task writer. The main agent writes plans and `.tasks/` files and sends a plan to `reviewer` only when it judges the work risky. Plans live in `context/plans/<feature>.md`. (0016)

## Questions

## Redirects

## Topics

- journaling-session-memory: onboarding, checkpoints, handoffs, COMMON compaction, archive retrieval, and topic routing
- orchestrating-agents: execution-shape classification, tracked and untracked delegation, context priming, integration, and independent review
- planning-tasks: self-applied planning, codebase research, plan files, risk-triggered plan review, task creation
- prototyping: explicit prototype mode, workflow overrides, acceptable shortcuts, minimal validation, delegation propagation, and handoff boundaries
- remoting-git: GitHub and GitLab issues, merge requests, pull requests, commit correlation, and remote workflow
- reviewing-code: committed branch and PR review, pass sequencing, findings, review state, and follow-up tasks
- skill-repository: canonical checkout, Codex mirror, shared and repo instruction files, host links, and tracked Claude subagents
- switch-account: `switch-account.py` credential slots, live-slot matching by refresh expiry, token rotation, profile re-fetch, and the `statusline.js` quota cache
