# Skill Repository

This repository is the canonical source for personal skills and Claude subagents.

## Repository Ownership

- Edit and commit only in `~/.claude/skills`.
- Treat `~/.agents/skills` as a read-only Git mirror.
- Update the mirror through Git after committed changes reach the remote.
- Keep repo instructions in `CLAUDE.md`.
- Keep global instructions in `GLOBAL_CLAUDE.md`.
- Keep `AGENTS.md` as a symlink to `CLAUDE.md`.
- Keep Claude subagent definitions in `.agents-claude/`.

## Skill and Agent Design

- Keep reusable agent behavior in its agent definition.
- Let invoking skills select the agent mode and provide task-specific context.
- Keep binding workflow and completion gates in `SKILL.md`.
- Put detailed contracts, templates, and examples in `references/`.
- Keep each contract authoritative in one file. Link to it instead of copying it.
- Update `README.md` when setup, layout, dependencies, or host integration changes.

## Writing Instructions

Use `writing-llm-document` for skills, agent definitions, session memory, PRDs, and other LLM-facing documents.

- Use plain English and sentences shorter than 20 words where practical.
- Write obligations for rules that must bind.
- Put binding rules in both the workflow and its completion gate.
- Remove prose that does not change agent behavior.
- Use exact paths, commands, conditions, and output names.
- Refer to skills by bare name unless documenting host UI syntax.

## Verification

- Read every changed instruction file and its directly linked contracts.
- Check changed links, paths, frontmatter, and symlinks against the repository.
- Run `npm test` in each changed package that has a `package.json`.
