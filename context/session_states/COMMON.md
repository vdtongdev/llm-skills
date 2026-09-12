---
budget_words: { target: 2000, hard: 3500 }
---

# Common Knowledge

## Constraints

## Decisions

- D-01: planning-tasks §3 uses competing cross-provider planners (2-3 cheap models at high/max effort) instead of single-agent design. Main agent holds user intent, produces disagreement report, user rules on deltas. 5b adversarial review retained for the written PRD.
- D-02: Exploration results are written to `context/exploration-<feature>.md` as a file artifact, not relayed through prompts. Planners read the doc directly, avoiding lossy re-serialization.
- D-03: Planner agents from §3 are reused for §5 PRD review (5a and 5b). Bias mitigated via "Ruled" convention. Avoids re-priming cost of fresh reviewer.
- D-04: One `planner.md` agent file, no default model. Caller specifies model via Agent tool's `model` parameter per invocation.
- D-05: Custom agents own reusable behavior; invoking skills steer each use; orchestrating-agents supplies context by agent type and mode. (0004)
- D-07: Shared host instructions live in `GLOBAL_CLAUDE.md`; repo instructions live in `CLAUDE.md`, with tracked `AGENTS.md -> CLAUDE.md`. Global host links must target `GLOBAL_CLAUDE.md`. (0004)
- D-08: General-purpose workers use identical bodies with inherited tools and preloaded `antipatterning`; separate high/max definitions select effort. Workers propose new antipatterns but never record them without permission. (0004)
- D-09: Planner remains the plan-review specialist. Read-only reviewer handles general artifacts, may review plans after caller confirms routing, and performs its own discovery. Committed branch/PR review uses `reviewing-code`; standalone or uncommitted code uses general artifact review. Delegated reviews return state proposals; only direct reviews write journals. (0004)

## Questions

## Redirects

## Topics

- journaling-session-memory: onboarding, checkpoints, handoffs, COMMON compaction, archive retrieval, and topic routing
- orchestrating-agents: execution-shape classification, tracked and untracked delegation, context priming, integration, and independent review
- planning-tasks: scope clarification, codebase exploration, competing cross-provider designs, PRD writing, adversarial review, task creation
- remoting-git: GitHub and GitLab issues, merge requests, pull requests, commit correlation, and remote workflow
- reviewing-code: committed branch and PR review, pass sequencing, findings, review state, and follow-up tasks
- skill-repository: canonical checkout, Codex mirror, shared and repo instruction files, host links, and tracked Claude subagents
