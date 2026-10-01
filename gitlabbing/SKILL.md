---
name: gitlabbing
description: GitLab workflow for issues, labels, merge requests, and release tags via `glab`. Use when filing, refining, labeling, correlating, or closing issues; creating MRs; or tagging a release. Triggers on "create MR", "merge request", "close issue", "update issue", "label", "tag", "release", "prepare for merge", "glab", or any issue/MR management task. Also use when wrapping up a feature branch or doing issue housekeeping.
---

# GitLabbing

## Load Project Config

Read the `gitlabbing` entry under `SKILL CONFIGURATION` in the project instructions. It may name:

- **GitLab project**: for example `tamnguyenswe-runners/banana`
- **Task tracker**: for example `managing-tasks`, with its list/show commands
- **Project config file**: extra project context; read it when named

Without config, read the project from `git remote -v`, skip task correlation, and offer to add the entry. On a GitHub remote, substitute `gh` equivalents.

## Conventions

**Titles**: `<type>: <description>`, lowercase after the colon, a phrase rather than a sentence.

| Type        | Use                | Issue label   |
| ----------- | ------------------ | ------------- |
| `feat:`     | New feature        | `enhancement` |
| `fix:`      | Bug fix            | `bug`         |
| `refactor:` | Code restructuring | `chore`       |
| `docs:`     | Documentation      | `chore`       |
| `test:`     | Test updates       | `chore`       |
| `ci:`       | CI/CD changes      | `chore`       |

**References**:

- `#N` is GitLab issue syntax and `!N` is MR syntax. GitLab links them in commit messages, comments, and MR bodies.
- `#N` must name a GitLab issue. Never write task tracker ids in commits, issues, comments, or MRs; the tracker is internal.
- Cite commits by bare hash: `Solved in de68231`. Never wrap hashes in backquotes; never write "solved recently".

**Push**: Push only when the user, project instructions, or global instructions authorize it.

**Prose**: State facts directly. No narrative filler, no time estimates.

## Issue Labels

Every issue you file or update must carry the labels below. Add labels with `glab issue create --label` or `glab issue update --label`; remove with `--unlabel`.

| Label         | Apply when                                                      |
| ------------- | --------------------------------------------------------------- |
| `bug`         | Type label for defects. Exactly one type label per issue.       |
| `enhancement` | Type label for new or improved behavior.                        |
| `chore`       | Type label for docs, setup, refactors, tests, and CI.           |
| `quick-win`   | The change is small and has a clear positive impact.            |
| `review`      | The issue holds incomplete ideas or unverified claims. Remove it once verified. |
| `done`        | The issue closed with its work finished.                        |
| `wont-do`     | The issue closed as dropped.                                    |

A closed issue carries exactly one of `done` or `wont-do`. If a project's labels differ, run `glab label list` or `glab label list -g <group>` and ask before inventing labels.

## Workflows

Read the reference for the task:

| Task                                      | Reference                      |
| ----------------------------------------- | ------------------------------ |
| Filing, refining, correlating, closing issues | `references/issue-workflow.md` |
| Creating merge/pull requests              | `references/mr-workflow.md`    |
| Tagging a release                         | `references/tag-workflow.md`   |

Commands use `glab`. Pass every multi-line body through a quoted heredoc:

```bash
glab issue update <id> --description "$(cat <<'EOF'
Line 1
Line 2
EOF
)"
```

## Completion Gate

Before reporting issue, MR, or tag work done, confirm:

- [ ] Titles follow `<type>: <description>`.
- [ ] Every touched issue has one type label; closed issues have `done` or `wont-do`.
- [ ] No task tracker ids appear in commits, issues, comments, MRs, or tags.
- [ ] Commit hashes are bare.
- [ ] Nothing was pushed without authorization.
