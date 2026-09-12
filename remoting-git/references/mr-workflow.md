# Merge / Pull Request Workflow

---

## Creation

```bash
glab mr create \
  --source-branch <branch> \
  --target-branch <target> \
  --title "<type>: <summary>" \
  --description "$(cat <<'EOF'
<description body>
EOF
)"
```

**Prerequisite:** All related issues should be updated, commented, and ready to close before creating the MR.

---

## Description Template

```markdown
## Summary

Brief overview of what this MR accomplishes.

### Features Implemented

**1. Feature Name (#issue_number)**

- Key implementation detail
- Include file paths
- Commit: <hash>

**2. Feature Name (#issue_number)**

- Implementation details
- Commit: <hash>

### Bug Fixes (if applicable)

**N. Bug Description**

- Root cause
- Solution implemented
- Commits: <hash>

## Testing

- Unit tests for X
- E2E tests for Y
- Full CI pipeline passing

## Related Issues

Closes #X, #Y, #Z
```

---

## Rules

- Reference rules: see SKILL.md § Conventions
- Group changes by feature/bugfix category
- Include commit hashes per feature
- Use `Closes #X` syntax for auto-close on merge
- Testing section states what was tested, not pass/fail results
- No narrative filler ("successfully", "we decided", "after careful consideration")

---

## Multi-Commit Features

When a feature spans multiple commits:

```markdown
**N. Feature Name (#issue - Part 1, #issue - Part 2)**

- First aspect of feature
- Second aspect of feature
- Commits: <hash1>, <hash2>
```

---

## Task Tracker Integration

If a task tracker is configured in project settings:

- Tasks are the source of truth for implementation details
- Copy relevant details from tasks into MR description
- Reference platform issues (`#X`) in the MR, not task IDs
- Tasks are internal; issues are external-facing

```
Task Tracker → guides implementation
Git Commit   → records change
Issue         → tracks user-facing feature
MR/PR        → references issues, includes commits
```
