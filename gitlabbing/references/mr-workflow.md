# Merge / Pull Request Workflow

Update, label, and comment every related issue before creating the MR (`references/issue-workflow.md`).

## Creation

```bash
glab mr create --source-branch <branch> --target-branch <target> \
  --title "<type>: <summary>" --description "$(cat <<'EOF'
<description body>
EOF
)"
```

## Description Template

```markdown
## Summary

What this MR accomplishes.

### Features

**1. Feature Name (#issue)**

- Implementation detail, with file path
- Commits: <hash1>, <hash2>

### Bug Fixes

**2. Bug Description (#issue)**

- Root cause
- Fix
- Commits: <hash>

## Testing

- Unit tests for X
- E2E tests for Y

## Related Issues

Closes #X, #Y, #Z
```

- Group changes by feature or fix; omit empty sections.
- For a feature split across issues, list them all: `(#8 - Part 1, #9 - Part 2)`.
- Testing lists what was tested, not pass/fail results.
- `Closes #X` must name every issue the MR resolves, so GitLab closes them on merge.

## Task Tracker Source

With a task tracker configured, copy implementation details from tasks into the description. Reference the matching `#N` issues, never task ids.
