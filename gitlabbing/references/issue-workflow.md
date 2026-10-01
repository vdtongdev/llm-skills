# Issue Workflow

Labels and title rules: SKILL.md § Conventions and § Issue Labels.

## Filing

```bash
glab issue create --title "feat: ..." --label enhancement,quick-win --description "$(cat <<'EOF'
...
EOF
)"
```

Add `review` when the description contains claims you have not verified.

## Refinement

Finish every step for one issue before starting the next.

### 1. Gather Context

```bash
glab issue list          # open issues; add --all only when closed issues matter
glab issue view <id>
git log --oneline --no-decorate
```

With a task tracker configured, list its tasks for correlation.

### 2. Correlate Issues to Commits

Build this table in working memory. The Task column is internal; never post it.

```
| Issue | Title          | Task | Commit(s) |
|-------|----------------|------|-----------|
| #8    | Currency types | 14   | de68231   |
```

Match issue titles and descriptions to completed tasks, then find solving commits in `git log`.

### 3. Update the Description

```markdown
Brief description of what was implemented.

## Implementation Details

**Backend**:

- Change, with file path

**Frontend**:

- Change, with file path

## Related

- Solved in commit: <hash>
```

- Group changes by area; omit areas without changes.
- State what changed, not why.

### 4. Update Title and Labels

```bash
glab issue update <id> --title "feat: ..." --label enhancement --unlabel review
```

### 5. Comment the Solving Commits

```bash
glab issue comment <id> --message "Solved in <hash1> (<feature1>) and <hash2> (<feature2>)"
```

### 6. Close

- An MR description containing `Closes #<id>` closes the issue on merge. Do not close it manually.
- Close manually only when the solving commits are already on the default branch, or the issue is dropped.

```bash
glab issue update <id> --label done      # or: --label wont-do
glab issue close <id>
```

## Batch Wrap-Up

1. Gather: `git log --oneline --no-decorate`, `glab issue list --all`, and the task list if configured.
2. Build the correlation table (§2).
3. Run §3-§6 for each row.
4. Create the MR last; see `references/mr-workflow.md`.
5. Label issues closed by earlier merges: run `glab issue list --closed --not-label done`, then add `done` to each result that lacks `wont-do`.
