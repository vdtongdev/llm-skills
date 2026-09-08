---
id: 0009
slug: lossy-common-compaction
started: 2026-08-05
finalized: true
branch: master
head: c3074d5
tasks: []
topics: [journaling-session-memory]
---

# Session 0009 - lossy-common-compaction

## Log

- discovered: current COMMON compaction has no safe disposition for true but low-value entries; `RETIRE` requires invalidation and `PROMOTE` becomes the only apparent removal path
- decision: COMMON compaction is intentionally lossy in the active view; immutable session Logs preserve evidence while recurring context retains only information likely to change future action
- decision: replace COMMON's topic-to-session lists with stable topic keys plus retrieval descriptions; session frontmatter owns forward topic tags and archive lookup greps those tags
- discovered: `example-common.md` is user-owned and untracked; keep it read-only as the compaction evaluation artifact
- done: `journaling-session-memory/references/compact-common.md` - added evidence-guided lossy compaction, future-action retention, decision residency, low-value removal, dense rewriting, and forward Topic routes
- done: `journaling-session-memory/{SKILL.md,references/common-format.md,references/onboard.md,references/checkpoint.md,references/offboard.md,references/session-format.md}` - aligned routing, lifecycle, archive retrieval, topic tagging, and budget handling with the new compaction workflow
- done: skill-creator validation passed through `uv run --with pyyaml`; `git diff --check` passed
- discovered: adversarial review found scope-relative deletion, checkpoint evidence bypass, legacy Topic migration, and mixed-anchor split ambiguities; all high/medium findings corrected in the affected references
- decision: legacy inverted Topic lists are sufficient migration evidence unless newer Handoff/Log evidence contradicts relevance; migration may backfill only stable topic codes in finalized frontmatter and must record every change in the active successor
- decision: retain linked Contents blocks in references over 100 lines; skill-creator requires navigation for long references, outweighing the reviewer's non-blocking concision concern
- done: clean-context forward test applied evidence retrieval and provisional lossy classifications to `example-common.md` without editing it; final adversarial re-review reported no high/medium issue
- done: final skill-creator validation, semantic assertions, em dash scan, and `git diff --check` passed; `example-common.md` remains untouched
- done: `COMMON.md` - added description-only `journaling-session-memory` Topic route; session frontmatter remains the forward index
- done: committed the validated eight-file journaling-session-memory update as `c3074d5` (`Improve COMMON compaction workflow`)

## Handoff

### Work

- [x] `journaling-session-memory/references/compact-common.md`: evidence-guided lossy compaction workflow added
- [x] `journaling-session-memory/SKILL.md`, workflow and format references: routing, decision residency, Topic forward index, legacy migration, and anchor splitting aligned
- [x] validation: skill validator, semantic checks, `git diff --check`, clean-context forward test, and adversarial re-review passed
- [x] `context/session_states/COMMON.md`: active journaling topic converted to description-only routing

### Next

1. Exercise `compact-common.md` against a project that has the cited session archive and refine only from observed retrieval loss or unsafe retention.

### State

- tree: tracked tree clean; user-owned `example-common.md` remains untracked and untouched
- retrieve: `c3074d5`, future-action test, forward Topic routes, legacy Topic migration, `split:`
