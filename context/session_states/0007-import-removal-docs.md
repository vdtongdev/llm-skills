---
id: 0007
slug: import-removal-docs
started: 2026-07-31
finalized: true
branch: master
head: 36f8cfa
tasks: []
topics: [managing-tasks, planning-tasks, journaling-session-memory, reviewing-code]
---

# Session 0007 - import-removal-docs

## Milestones

- done: onboarded from 0006. Clean shutdown - `finalized: true`, HEAD still `a261f34`, 14 modified + 3 untracked files match the capsule exactly. No stash, no `.tasks/`, COMMON.md at 60 lines. User said "continue, auto mode": finish step 5's doc pass without further confirmation

- decision: the allocation rules live in `file-format.md` § Allocating a new file's identity ONLY, and `integration-contract.md` § Allocation rules was CUT to a pointer. 0006's checklist said file-format must gain them, which would have made C-16's exact mistake (one shape, two docs, drifts in one). D-14 still holds: the contract keeps the producer-only consequence (call `get-new-uid` once per run; count your own writes when computing the next id), file-format owns the on-disk invariant
- done: `file-format.md` - added § Allocating a new file's identity (id/prefix/uid table), the repo-wide id-uniqueness rule under § Identity rules, and the `depends_on` / `depends_on_uids` hand-edit carve-out flagged in 0005. Fixed a dead cross-ref: `integration-contract.md:115` pointed at "`file-format.md` § Merge conflicts", a section that does not exist (it is § Identity rules)
- done: `README.md` - import/batch out, `task verify` in (review section + merge-conflict troubleshooting now covers duplicate ids), `/preserving-session-memory` -> `/journaling-session-memory`, new § `kind` and `context[]`, hardcoded `~/.claude/skills` softened to `<skills-dir>` with the codex path named. Verified `--context` and `add-context --kind/--ref/--why` against `cli-reference.md:37,153` before writing the examples (C-07)
- done: `MAINTENANCE.md` - 0006 was right that it had no import debt, but it had a real gap: nothing routed human-facing content, and `README.md` had no size threshold. Added a routing row, a 350-line threshold, and a classification rule (README may repeat a command, never a shape)
- note: final grep found two live references the import track had missed. `planning-tasks/references/managing-tasks-integration.md:26` still gated on `depends_on_labels` in an ENFORCED checklist row - a rule binding on a field that no longer exists (C-02 in reverse). `reviewing-code/SKILL.md` routed multi-session handoff to the deleted `/preserving-session-memory` at three points, including a "validate SESSION_STATE first" resume gate; rewritten around the journal's Handoff Capsule and `branch:`/`head:` frontmatter
- note: `CLAUDE.md:27` (user's GLOBAL file) also still names `/preserving-session-memory`. Left untouched - it is the user's own file, not this repo's. Flagged to him
- note: suite 60 green. First run failed on `storage: concurrent lock serialized` (`test.mjs:98`, lock ordering `b` before `a`) - the pre-existing ~1-in-5 flake recorded in 0006, `storage.mjs` untouched this session. Passed on re-run

- note: `~/.claude/CLAUDE.md` is a SYMLINK to `~/.claude/skills/CLAUDE.md`. It is a tracked file in this repo, not the user's separate global file - I had told him it was his own file and out of scope. The Edit tool refused the symlink path; `readlink -f` gave the real target
- decision: USER RULED - fix the CLAUDE.md ref, and commit as multiple commits
- done: COMMITTED, tree clean. `954df76` managing-tasks (code + tests + its own docs), `d3e3f35` planning-tasks + reviewing-code + CLAUDE.md fallout, `36f8cfa` the offboard `context[]` change carried since 0005. Q-06 (nothing committed since 0001) is now resolved

- decision: USER RULED - offboard is too heavy; move the COMMON.md budget check to onboard "where we still have plenty of context". Generalised into the thinning rule now stated in offboard.md: "Transcribe, don't judge. No compaction, no eviction, no doc rewrites - those need context, so they belong to onboard"
- done: `journaling-session-memory` - budget check and eviction moved wholly to onboard Step 7 (SKILL.md's two budget mentions updated to match); offboard Priority 4 (Update Context Docs) DELETED, it was gated "only if tokens allow" at the moment tokens are gone and the capsule's "Docs That May Need Updating" already carries it; Priority 3 cut to status transitions only, since `add-note` catch-up contradicts checkpoint.md's write-it-hot rule
- note: found a real inconsistency - SKILL.md says "Both onboard and offboard run `git-state.sh`" but offboard.md never mentioned it and told you to write Uncommitted Changes from memory. Offboard P1 now runs it, and `head:` + Uncommitted Changes both source from it. This is why today's onboard could verify 0006's handoff instead of trusting it
- decision: USER RULED - the edits were verbose: "I don't think you need to *explain*, but rather *instruct*". Rewrote every added line as an instruction, keeping a why only as a trailing clause where D-02 applies. Offboard did NOT get shorter (73 lines before and after) - what changed is that it now makes zero judgment calls
- note: no MAINTENANCE.md for journaling-session-memory. User ruled: not needed. Q-03 stays about `/maintaining-skills` being too strict, not about this skill
- done: prose pass on `managing-tasks/SKILL.md` (139 -> 119) and `planning-tasks/SKILL.md` (286 -> 281). Deleted § When to use (restated the frontmatter description verbatim) and § Decision graph (a command list, already covered by the Quick reference line); `kind`/`context[]` had been explained FOUR times, now once in § Proactive context loading with the rest as pointers. `MAINTENANCE.md` routing row fixed - it still pointed at the deleted § Decision graph
- note: THREE of the worst duplications were mine, written earlier this same session - the uid/merge-order rationale and the not-atomic rationale each ended up in three files. C-16 caught in the act, within hours of citing it. The tell: I wrote the same sentence into a second file because it "belonged" there too, instead of writing a pointer
- done: fixed a factual bug in `planning-tasks/SKILL.md:221` - "that task can never reach `completed`". There is no `completed` status; the schema is pending|in-progress|done|blocked|cancelled (`file-format.md:53`). Now `done`

## Corrections

## Handoff Capsule

### Status

implementing - the import-removal track is closed and committed; a prose-quality pass on three skills is complete but uncommitted

### What's Done

Committed (`954df76`, `d3e3f35`, `36f8cfa`):

- `managing-tasks/references/file-format.md`: new § Allocating a new file's identity, repo-wide id uniqueness, `depends_on`/`depends_on_uids` hand-edit carve-out
- `managing-tasks/references/integration-contract.md`: § Allocation rules CUT to a pointer at file-format; dead cross-ref to a nonexistent "§ Merge conflicts" fixed
- `managing-tasks/README.md`: import out, `verify` in, `/journaling-session-memory`, new § `kind` and `context[]`, `<skills-dir>` not a hardcoded path
- `managing-tasks/MAINTENANCE.md`: routing row + 350-line threshold for README, README-vs-references classification rule
- `planning-tasks/references/managing-tasks-integration.md`: Deps row no longer gates on the deleted `depends_on_labels`
- `reviewing-code/SKILL.md`: handoff rerouted from the deleted `/preserving-session-memory` to the journal's capsule
- `CLAUDE.md`: same dead skill reference

Uncommitted:

- `journaling-session-memory/references/offboard.md`: budget check + Priority 4 removed, Priority 3 cut to status only, git-state step added
- `journaling-session-memory/references/onboard.md`: Step 7 owns the whole budget obligation
- `journaling-session-memory/SKILL.md`: budget stated as onboard-only in both places
- `managing-tasks/SKILL.md`: two sections deleted, `kind`/`context[]` de-duplicated
- `planning-tasks/SKILL.md`: prose compressed, `completed` -> `done` bug fixed
- `managing-tasks/MAINTENANCE.md`: routing row for the deleted § Decision graph

### Work Checklist

- [ ] Commit the 6 dirty files. User was asked "one commit or two?" and ended the session instead - ASK, do not guess. Natural split: journaling-session-memory (offboard thinning) / managing-tasks + planning-tasks (prose pass)
- [ ] Q-07 and Q-04 - open since 0002/0003, raised in three sessions, never ruled. Either get a ruling or close them as won't-do. Do not raise them a fourth time as a status line

### What's Next

1. Ask about committing the 6 files, then commit
2. Nothing else is in flight. The import-removal track is finished

### Failed Approaches

No tracker in this repo. Nothing abandoned this session.

### Open Questions (session-scoped)

- How to commit the remaining 6 files (one commit or two) - asked, unanswered
- Whether the capsule's "What's Done" should be dropped in favour of pointing at Milestones. I raised it, took the middle path (offboard now says "compress this file's `done:` milestones; do not re-derive from memory") and the user did not rule. The aggressive version changes onboard's contract that the capsule is the only required read

### Uncommitted Changes

6 modified files, no stash, HEAD `36f8cfa`, branch master. Listed above. No new/untracked files - the journal lives under `context/`, which is gitignored (`.gitignore:3`).

### Docs That Will Need Reading

- `/writing-llm-document` - if any more prose work happens. The whole back half of this session was its § Quick Checklist applied by hand
- `context/session_states/COMMON.md` - C-16 (a shape in two docs drifts) and D-14 (contract owns the producer view) both got exercised hard today

### Docs That May Need Updating

Nothing known stale. The doc pass that opened this session is what closed it.

### Retrieval Hints

- the offboard/onboard budget split: grep `Transcribe, don't judge`, `Step 7`
- the allocation rules' single home: grep `Allocating a new file's identity`
- `~/.claude/CLAUDE.md` is a SYMLINK to `~/.claude/skills/CLAUDE.md` - it is a tracked file in this repo, and the Edit tool refuses the symlink path. Use `readlink -f`
- still parked from 0005: merging `managing-tasks` + `planning-tasks`, grep `kanban`
