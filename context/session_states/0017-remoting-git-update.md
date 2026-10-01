---
id: 0017
slug: remoting-git-update
started: 2026-10-01
finalized: false
branch: master
head:
tasks: []
topics: [remoting-git]
---

# Session 0017 - remoting-git-update

Continues finalized session 0016.

## Log

- done: `remoting-git/` - fixed contradictions: push defers to user/project/global authorization; `#N` means a GitLab issue and task tracker ids never appear in commits, issues, comments, MRs, or tags; Testing lists what was tested; issues named by `Closes #N` are not closed manually. Pruned prose and added a Completion Gate. GitLab-only command examples kept by user choice.
- done: `remoting-git/SKILL.md` § Issue Labels - label taxonomy of group `tamnguyenswe-runners` (`bug`, `enhancement`, `chore`, `quick-win`, `review`, `done`, `wont-do`); exactly one type label; closed issues carry `done` or `wont-do`; title type maps to type label (`refactor`/`docs`/`test`/`ci` -> `chore`). Label names only; group label ids live in GitLab.
- done: `remoting-git/references/tag-workflow.md` - annotated tag message summarizes changes since the previous tag at 1/3-1/2 of the in-range MR bodies' word count, without commit hashes or `see !N` pointers. MRs in range come from `git log --merges --format='%b' <prev>..HEAD`.
- discovered: `git tag -F` strips lines starting with `#`, so markdown headings and line-leading issue refs vanish from tag messages. Verified in a scratch repo.
- discovered: coconut tags `v2026.09.25.2-release` to `v2026.09.28.0-release` carry only "see !N for details" messages, the behavior the tag workflow replaces.
- decision: renamed `remoting-git` -> `gitlabbing`. The user required a short, easy-to-type name whose first word collides with no existing skill or Claude Code command; the "re" prefix is crowded (`reviewing-code`, `remote-env`, `/resume`, `/review`). GitHub coverage dropped to one fallback line because the user works on GitLab only.
- done: `gitlabbing/` - directory, frontmatter, heading, config key, and GitLab-only description; `README.md` row re-sorted; `~/projects/banana/CLAUDE.md` config key renamed, uncommitted on branch `58-stack-upgrade`. Topic code stays `remoting-git` because assigned codes never change.
