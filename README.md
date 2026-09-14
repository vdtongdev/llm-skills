# Personal Agent Skills and Subagents

This private repository is the shared source for Claude Code and Codex skills. Edit and commit only in `~/.claude/skills`; the Codex checkout is a read-only mirror updated through Git.

## First-time setup

Clone this repository to `~/.claude/skills` first. Then run:

```bash
mkdir -p ~/.agents ~/.codex
git clone "$(git -C ~/.claude/skills remote get-url origin)" ~/.agents/skills
ln -s ~/.claude/skills/GLOBAL_CLAUDE.md ~/.claude/CLAUDE.md
ln -s ~/.agents/skills/GLOBAL_CLAUDE.md ~/.codex/AGENTS.md
ln -s skills/.agents-claude ~/.claude/agents
npm ci --prefix ~/.claude/skills/managing-tasks
```

`ln -s` refuses existing targets. Inspect each destination and resolve conflicts manually. Do not overwrite them.

Claude Code reads skills from `~/.claude/skills`. Codex reads the mirror from `~/.agents/skills`. Both use the same committed `SKILL.md` files and resources.

Both hosts load shared instructions from `GLOBAL_CLAUDE.md`. Repository work also loads `CLAUDE.md` through the tracked `AGENTS.md` symlink.

Claude Code reads personal subagents through `~/.claude/agents`. That path links to the tracked `.agents-claude/` directory in this repository.

The `plan-reviewer` agent reviews completed PRDs. The main agent owns research synthesis, design decisions, and PRD writing.

## Migrate existing instruction links

First synchronize a commit that contains `GLOBAL_CLAUDE.md`. Then inspect the existing links:

```bash
readlink ~/.claude/CLAUDE.md
readlink ~/.codex/AGENTS.md
```

If they are the managed links from the previous layout, repoint them:

```bash
ln -sfn ~/.claude/skills/GLOBAL_CLAUDE.md ~/.claude/CLAUDE.md
ln -sfn ~/.agents/skills/GLOBAL_CLAUDE.md ~/.codex/AGENTS.md
```

## Synchronize committed changes

Commit changes in `~/.claude/skills`, then run:

```bash
git -C ~/.claude/skills push
git -C ~/.agents/skills pull --ff-only
```

Resolve rejected pushes, dirty worktrees, and divergent branches with ordinary Git commands. Do not force-push, reset, clean, or overwrite files merely to make the mirror update.

Run `npm ci --prefix ~/.claude/skills/managing-tasks` after `managing-tasks/package.json` or `managing-tasks/package-lock.json` changes.

## Task command

Both agents use the canonical executable:

```bash
~/.claude/skills/managing-tasks/bin/task --help
```

An optional shell alias is:

```bash
alias task="~/.claude/skills/managing-tasks/bin/task"
```

## Remove Codex integration

Before removing anything, verify the managed link and mirror:

```bash
readlink ~/.codex/AGENTS.md
git -C ~/.agents/skills status --short
```

The expected link target is `~/.agents/skills/GLOBAL_CLAUDE.md`. Remove only that link and the clean mirror checkout; keep `~/.codex/skills/.system` untouched.
