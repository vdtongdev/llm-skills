# Personal Agent Skills and Subagents

Shared source for personal Claude Code and Codex skills, Claude subagents, and their supporting CLIs.

## Contents

- [Install](#install)
- [Skills](#skills)
- [Claude subagents](#claude-subagents)
- [Update](#update)
- [Remove Codex integration](#remove-codex-integration)

## Install

Requires Git and Node.js 20 or newer.

```bash
git clone git@gitlab.com:tamnguyenswe/llm-skills.git ~/.claude/skills
mkdir -p ~/.agents ~/.codex
git clone "$(git -C ~/.claude/skills remote get-url origin)" ~/.agents/skills

npm ci --prefix ~/.claude/skills/antipatterning
npm ci --prefix ~/.claude/skills/managing-tasks
npm ci --prefix ~/.claude/skills/testing-code

ln -s ~/.claude/skills/GLOBAL_CLAUDE.md ~/.claude/CLAUDE.md
ln -s ~/.agents/skills/GLOBAL_CLAUDE.md ~/.codex/AGENTS.md
ln -s skills/.agents-claude ~/.claude/agents
```

Inspect and resolve existing link targets before running `ln -s`. Do not overwrite them.

## Skills

| Skill | Purpose |
| --- | --- |
| `antipatterning` | Recall and maintain project anti-pattern records. |
| `journaling-session-memory` | Resume, checkpoint, hand off, and compact project session memory. |
| `maintaining-skills` | Update evolvable skill knowledge when explicitly requested. |
| `managing-tasks` | Track project tasks, dependencies, context, and status in `.tasks/`. |
| `orchestrating-agents` | Coordinate delegated work, parallel agents, integration, and review. |
| `planning-tasks` | Research complex changes and write a short plan file that carries work across sessions. |
| `prototyping` | Build fast, disposable prototypes with reduced planning, testing, and review rigor. |
| `remoting-git` | Manage GitHub and GitLab issues, merge requests, and pull requests. |
| `reviewing-code` | Review committed branches and pull requests before merge. |
| `testing-code` | Plan, write, maintain, and map valuable automated tests. |
| `writing-llm-document` | Write concise instructions and context documents for LLM consumption. |

Bundled CLIs:

| Command | Purpose |
| --- | --- |
| `~/.claude/skills/antipatterning/bin/antipattern` | Query and update anti-pattern registries. |
| `~/.claude/skills/managing-tasks/bin/task` | Manage project task files. |
| `~/.claude/skills/testing-code/bin/testmap` | Query and validate test registries. |

## Claude subagents

| Agent | Purpose |
| --- | --- |
| `allrounder-low`, `allrounder-high`, `allrounder-max` | Handle bounded implementation and investigation with configured effort profiles. |
| `discoverer` | Locate code and trace references without editing. |
| `reviewer` | Review code and other technical artifacts independently. |

## Update

Edit and commit only in `~/.claude/skills`. Treat `~/.agents/skills` as a read-only Git mirror.

Commit and push canonical changes before updating the mirror:

```bash
git -C ~/.claude/skills push
git -C ~/.agents/skills pull --ff-only
```

Run `npm ci --prefix ~/.claude/skills/<package>` after changing a package's `package.json` or `package-lock.json`.

## Remove Codex integration

Verify the managed link and clean mirror first:

```bash
readlink ~/.codex/AGENTS.md
git -C ~/.agents/skills status --short
```

The expected link target is `~/.agents/skills/GLOBAL_CLAUDE.md`. Remove only that link and a clean mirror checkout. Keep `~/.codex/skills/.system`.
