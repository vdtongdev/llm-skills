# Issue Workflow

---

## Refinement Process

Work through each issue sequentially — complete all steps for one before moving to the next.

### 1. Gather Context

```bash
glab issue list
glab issue view <id>
git log --oneline --no-decorate
```

If a task tracker is configured, pull the task list for correlation.

### 2. Correlate Issues to Commits

Build a correlation table mapping each issue to its solving commit(s):

```
| Issue | Title          | Task (if tracked) | Commit(s) |
|-------|----------------|--------------------|-----------|
| #8    | Currency types | #14                | de68231   |
```

**Steps:**

1. Review task list (if task tracker configured)
2. Match issue titles/descriptions to completed work
3. Identify solving commits via `git log --oneline`

### 3. Update Issue Descriptions

**Template:**

```markdown
Brief description of what was implemented.

## Implementation Details

**Backend**: Changes made

- Key modifications with file paths

**Frontend**: Changes made

- Key modifications with file paths

**Additional Features**: (if applicable)

- Secondary features

## Related

- Task: #<task_id> (if task tracker configured)
- Solved in commit: <hash>
```

**Rules:**

- Bullet points for details
- Include file paths where code was modified
- Separate backend/frontend changes
- Focus on what changed, not why
- Include task reference if tracker configured
- Include solving commit hash

### 4. Update Issue Titles

Format: `<type>: <description>` — see SKILL.md § Conventions for type list.

### 5. Add Commit Reference Comment

```bash
glab issue comment <id> --message "Solved in <hash1> (<feature1>) and <hash2> (<feature2>)"
```

### 6. Close Issues

Close only after all of:

- Description updated
- Title formatted
- Commit comment added
- Implementation merged (or ready to merge)

---

## Full Correlation Process

For wrapping up a batch of work across multiple issues:

### 1. Gather All Data

```bash
git log --oneline --no-decorate
glab issue list --all                # --all needed here to include closed issues
# If task tracker configured:
task list  # or equivalent
```

### 2. Build Correlation Table

```
| Issue | Title | Task | Commit(s) |
|-------|-------|------|-----------|
| #X    | ...   | #Y   | hash      |
```

### 3. Process Each Issue

For each row in the table:

1. Update description (§3 above)
2. Update title (§4)
3. Add commit comment (§5)
4. Close (§6)

### 4. Create MR Last

After all issues are updated — see `references/mr-workflow.md`.
