---
name: antipatterning
description: Manage and recall project anti-pattern records. Use when starting or expanding implementation, testing, review, documentation, infrastructure, Git, or agent work in a project with `.antipatterns/`; when recording a rule that caught or prevented a problem; or when creating, changing, retiring, merging, or splitting anti-pattern records.
---

# Antipatterning

Use the bundled CLI from the project root:

```bash
~/.agents/skills/antipatterning/bin/antipattern <command>
```

## Recall

Before work:

1. Run `antipattern topics`.
2. Choose every self-descriptive topic that fits the actual work.
3. Run `antipattern select` with those topics and known paths.
4. Read the returned `avoid`, `prefer`, and `why` fields before acting.

```bash
~/.agents/skills/antipatterning/bin/antipattern topics
~/.agents/skills/antipatterning/bin/antipattern select \
  --topic frontend --topic tabular-ui \
  --path frontend/src/components/table/Table.tsx
```

Refresh the selection when work expands to new topics or paths. Run one final selection against every changed path before completion.

Use `--id AP-001` for an explicit task or planner hint. Use `show AP-001` only when compact guidance is insufficient.

## Record an encounter

Record an encounter when a rule changes the work, catches a problem, or prevents a likely problem. Do not record repeated observations of the same fact during one piece of work.

```bash
~/.agents/skills/antipatterning/bin/antipattern encounter AP-001 \
  --ref session:0168 \
  --note "Kept transformation logic inside the migration."
```

An encounter contains `date`, `ref`, and `note`. Do not classify it with a logger-style kind.

## Write records

Store one YAML file per rule under `.antipatterns/`:

```yaml
schema: 1
id: AP-001
title: Do not import service decision logic into migrations
status: active
topics: [backend, database-migrations, alembic]
paths: [alembic/versions/**/*.py]
guidance:
  avoid: Do not import service decision logic into a migration.
  prefer: Keep a frozen copy inside the revision.
  why: Application changes can break historical migration replay.
selection:
  pinned: false
examples: {}
relationships: {}
provenance:
  references: []
  encounters: []
```

Use clear kebab-case topics. Reuse existing topics when they fit. Do not create a topic catalog.

Keep guidance short:

- `avoid`: what not to do.
- `prefer`: what to do instead.
- `why`: the concrete failure prevented.

Examples are optional. Guidance must remain complete without them.

Use stable IDs. Change titles and filenames without changing IDs. Record lineage in `relationships` when replacing, merging, or splitting entries.

## Entry fitness

Apply these criteria when creating, migrating, or reviewing entries.

An entry belongs in the registry when ALL of these hold:

- **Recurrent**: the trap has a realistic chance of firing again. A one-shot lesson already applied everywhere is dead weight.
- **Not tool-covered**: if a linter, type checker, or compiler already flags the exact mistake, the tool is the recall mechanism. Do not duplicate it.
- **Not duplicative**: if two entries share the same root rule, merge them. Different failure modes go in one entry's guidance, not two entries.
- **Still relevant**: if the codebase has moved past the condition (framework migration complete, API removed), retire the entry.
- **Non-obvious**: the trap must be something a competent reader of the code would not catch from context alone.

When migrating entries from prose documents, do not port mechanically. Evaluate every entry against these criteria and flag merges, retirements, and questionable entries before writing YAML.

## Validate

Run validation after editing records:

```bash
~/.agents/skills/antipatterning/bin/antipattern validate
```

Malformed or invalid YAML does not stop registry scans. Normal commands skip the file and warn on stderr. `validate` checks every readable file, reports all problems on stdout, and exits nonzero when any problem exists.

## Commands

- `topics`: List topics from active records with usage counts.
- `select [--topic TOPIC] [--path PATH] [--id ID] [--limit N]`: Return compact guidance and selection reasons.
- `show ID`: Return one complete record.
- `encounter ID --ref REF --note NOTE`: Append an encounter.
- `validate`: Check every record and report all problems.
