---
name: remoting-git
description: Workflow for managing issues and merge/pull requests on git remote platforms (GitLab, GitHub). Use when creating MRs/PRs, refining issues, correlating work items to commits, updating issue descriptions, or closing issues. Triggers on "create MR", "merge request", "pull request", "close issue", "update issue", "prepare for merge", "glab", "gh pr", or any issue/MR/PR management task. Also use when wrapping up a feature branch or doing issue housekeeping.
---

# Remoting Git

## Load Project Config

Check for a `remoting-git` section in the project instructions under `SKILL CONFIGURATION`. It should specify:

- **Platform** — GitLab or GitHub
- **CLI tool** — `glab` or `gh`
- **Task tracker** — tool that tracks implementation work (e.g., `managing-tasks`, Linear, Jira), if any
- **Task tracker commands** — how to list/view tasks (e.g., `task list`, `task show <id>`)
- **Project config** — path to project-specific config file with additional context (e.g., `context/GITLAB_WORKFLOW.md`)

If a project config file is specified, read it for project-specific details.

If no config exists, infer platform from remote URL (`git remote -v`). Default to no task tracker correlation. Offer to add a `remoting-git` section to the project instructions under `SKILL CONFIGURATION`.

---

## Conventions

**Title format:** `<type>: <description>`

| Type        | Use                |
| ----------- | ------------------ |
| `feat:`     | New feature        |
| `fix:`      | Bug fix            |
| `refactor:` | Code restructuring |
| `docs:`     | Documentation      |
| `test:`     | Test updates       |
| `ci:`       | CI/CD changes      |

- Lowercase after colon
- Concise phrase, not a full sentence

**References:**

- Issues by number: `#5`, `#12` — never reference internal task tracker IDs in issues/MRs (issues are external-facing, task tracker is internal)
- Always include specific commit hashes — never "solved recently" or "fixed in latest commit"

**LLM agent rule:** Do not push to remote unless the user explicitly asks. Assume the user handles push.

---

## Workflows

Two workflows — read the relevant reference when needed:

| Task                                      | Reference                      |
| ----------------------------------------- | ------------------------------ |
| Refining, correlating, and closing issues | `references/issue-workflow.md` |
| Creating merge/pull requests              | `references/mr-workflow.md`    |

---

## Commands Quick Reference

Commands below use `glab` (GitLab). Substitute `gh` equivalents for GitHub.

```bash
# Issues
glab issue list                                # Open issues (no --all unless asked)
glab issue view <id>
glab issue update <id> --title "feat: ..."
glab issue update <id> --description "..."
glab issue comment <id> --message "..."
glab issue close <id>

# MRs
glab mr create --source-branch <src> --target-branch <target> \
  --title "feat: summary" --description "..."
```

**Multi-line descriptions** — always use heredoc:

```bash
glab issue update <id> --description "$(cat <<'EOF'
Line 1
Line 2
EOF
)"
```

**Batch processing:**

```bash
# View multiple issues
for id in 5 6 7 8; do glab issue view $id; done

# Process one issue end-to-end
glab issue update 8 --title "..." && \
  glab issue comment 8 --message "..." && \
  glab issue close 8
```

---

## Anti-Patterns

```bash
# ❌ Internal task tracker ID in GitLab/GitHub
"Implements Task #14"
# ✅ Reference platform issues
"Implements #8"

# ❌ Wrapping commit hashes in backquotes
"Solved in `de68231`"
# ✅ Don't wrap, use bare hash
"Solved in de68231"

# ❌ Vague commit reference
"Solved recently"
# ✅ Specific hash
"Solved in de68231"

# ❌ Narrative filler
"After careful consideration, we successfully implemented..."
# ✅ Direct facts
"Implemented multi-currency support with dynamic symbols per reserve"

# ❌ Generic title
"Feature updates"
# ✅ Conventional format
"feat: implement multi-currency support and latest price valuation"

# ❌ Missing issue references in MR
Closes task 14
# ✅ Proper issue syntax
Closes #8

# ❌ Time estimates
"Step 1: Create endpoint (2 hours)"
# ✅ Just the action
"Create endpoint to query MIN(transaction_date)"

# ❌ Push to remote without being asked
git push origin <branch>
# ✅ No push command — user handles it
```
