---
id: 0013
slug: prototyping-skill
started: 2026-09-16
finalized: true
branch: master
head: a65b142
tasks: []
topics: [skill-repository, prototyping]
---

# Session 0013 - prototyping-skill

## Log

- decision: Prototype mode controls engineering rigor, not execution shape. It can use task tracking and delegated workers while overriding default PRD, TDD, broad verification, and review workflows.
- done: `prototyping/SKILL.md` - added explicit mode boundaries, skill overrides, acceptable shortcuts, minimal documentation, safety rules, handoff requirements, and a completion gate.
- abandoned: bundled `quick_validate.py` - both `python` and `python3` are unavailable (root cause: the environment has no Python interpreter).
- done: `README.md` - replaced explanatory host prose and legacy migration steps with concise installation, skills, CLI, subagent, update, and removal references.

## Handoff

### Work

- [x] `prototyping/SKILL.md`: added explicit prototype mode with centralized workflow overrides
- [x] `README.md`: added concise navigation, complete dependency installation, skill descriptions, CLI references, and subagent descriptions; removed legacy link migration
- [x] `context/session_states/COMMON.md`: added the `prototyping` retrieval topic
- [-] validation: frontmatter, documented paths, whitespace, prohibited dashes, symlink state, and `git diff --check` passed; bundled Python validator could not run

### Next

1. Review the uncommitted diff and commit it when authorized.
2. Push the commit, then update the read-only Codex mirror through Git.

### State

- tree: dirty with `README.md`, `context/session_states/COMMON.md`, session 0013, and new `prototyping/`
- load: `prototyping/SKILL.md`, `README.md`
- avoid: `quick_validate.py` cannot run because the environment has no `python` or `python3`
- retrieve: prototype mode, centralized override contract, README skill table
