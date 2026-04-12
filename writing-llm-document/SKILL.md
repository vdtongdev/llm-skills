---
name: writing-llm-document
description: Always use when writing or editing documentation files intended for LLM consumption — context docs, instruction files, inventories, session state, PRDs. Auto-triggers whenever the agent creates or modifies .md files that serve as agent context. Do not use for human-facing docs (README, API docs, changelogs).
---

# Writing LLM Documents

Every line must change agent behavior. If it doesn't, cut it.

## Process

1. **Read target file first** — check existing content, format, structure
2. **Check for project-level style override** — project CLAUDE.md or project-specific writing guide takes precedence
3. **Write** — follow `references/style-guide.md`
4. **Pre-save checklist** — run `references/style-guide.md` § Quick Checklist

## Project-Level Overrides

This skill defines **prose quality and conciseness**. Projects define structure, format, and routing. When both exist, project guide wins on format; this skill wins on prose.
