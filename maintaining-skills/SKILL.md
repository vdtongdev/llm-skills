---
name: maintaining-skills
description: Update evolvable skill knowledge files. Use only when the user explicitly names maintaining-skills to teach, add, or update knowledge in a skill. Never auto-trigger.
---

# Maintaining Skills

Update evolvable skills with new knowledge. The user must explicitly name maintaining-skills; never auto-trigger.

## Invocation

`maintaining-skills [target]: <content>`

- **With target**: `maintaining-skills querying-internal-data: Settlement updates on the 10th`
- **Without target**: `maintaining-skills: <content>` - infer from active skills in conversation, ask to confirm if ambiguous

## Process

### 1. Identify target skill

- **Explicit**: user named it in the invocation
- **Infer**: check which skills are active in the conversation. If ambiguous or no skills active, ask user.

### 2. Find MAINTENANCE.md

Look for the target's maintenance config:

- Generic user skills: always edit `~/.claude/skills/{name}/MAINTENANCE.md`, including when this skill was loaded from the Codex mirror. Never edit `~/.agents/skills`.
- Project skills under Claude Code: `{project_root}/.claude/skills/{name}/MAINTENANCE.md`
- Project skills under Codex: `{project_root}/.agents/skills/{name}/MAINTENANCE.md`

If both project paths exist as distinct directories, ask which is authoritative before editing.

`{project_root}` = the git root of the current working directory. If not in a git repo, ask the user.

If no MAINTENANCE.md exists, the skill is not evolvable. Tell the user.

### 3. Read MAINTENANCE.md

The target's MAINTENANCE.md contains:

- **Routing table**: content type → target file
- **Classification rules**: how to distinguish content types
- **Format patterns**: what entries look like in each target file
- **File size thresholds**: per-file line limits

### 4. Classify content

Use the target's classification rules to determine content type and target file.

If unclear, ask the user: _"This could be [type A] or [type B] — which fits better?"_

### 5. Read target file

Before writing anything, read the target file and check for:

- **Duplicates** — similar content already exists → update/augment instead of adding
- **Contradictions** — conflicts with existing content → surface to user, ask which is correct
- **Insertion point** — which section the new content belongs in

### 6. Condense

Apply condensation rules from `references/quality-standards.md`. Never store verbose conversational text.

### 7. Format

Match the target file's existing format patterns as specified in MAINTENANCE.md.

### 8. Check file size

Compare current line count + new content against the threshold from MAINTENANCE.md.

If it would exceed the threshold:

```
Warning: `{file}` is now {X} lines (threshold: {max}).
Recommend: review for consolidation or split into focused sub-topics.
```

Proceed with the update but surface the warning.

### 9. Confirm with user

Show exactly what will be added and where. Include:

- Target file path
- Section where content will be inserted
- The formatted content

Wait for explicit confirmation before writing.

### 10. Write and confirm

Apply the update. Confirm what was written and where.

## Learning Sessions

For multi-step exploration (not one-shot facts):

1. **Exploration**: user guides through examples, tests understanding
2. **Draft in conversation**: iterate on content before committing — do NOT write to files yet
3. **User confirms**: explicit signal to commit (e.g., "ok, learn that")
4. **Update**: follow steps 4-10 above with the finalized content

## Rules

- **Never update without confirmation** — always show the proposed change first
- **One update at a time** — don't batch unrelated updates into a single write
- **Condensation is mandatory** — see `references/quality-standards.md`
- **Read before write** — always read the target file before proposing changes
- **MAINTENANCE.md is user-managed** — this process does not update MAINTENANCE.md itself. Users modify routing/config directly when needed.
