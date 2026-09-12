# Compact COMMON

Compact COMMON as an intentionally lossy active view. Session Logs retain evidence; COMMON retains only information worth loading for future work. Truth alone does not justify recurring context cost.

## Contents

- [Prepare](#prepare)
- [Investigate before classifying](#investigate-before-classifying)
- [Retention and decision classification](#apply-the-future-action-test)
- [Low-value removal and dense rewriting](#remove-low-value-text)
- [Forward Topic routes](#rebuild-topics-as-forward-routes)
- [Completion checks](#finish)

## Prepare

1. If no unfinalized current session exists, follow `onboard.md` through session creation before editing.
2. Read COMMON whole and count it with `wc -w`.
3. Read `common-format.md`.
4. Inventory each C/D/Q entry, Redirect, and Topic. Classify independent clauses separately when an entry mixes subjects.

Never rewrite historical Logs. Record semantic removals at the completed compaction checkpoint.

## Investigate Before Classifying

Do not classify from the compressed entry alone. Recover only enough context to judge future value:

1. Extract anchor, cited sessions, topic code, paths, symbols, commands, issue ids, and task ids.
2. Read cited session Handoffs first.
3. Search cited Logs for the anchor and subject terms; read only relevant passages.
4. When evidence remains incomplete, grep the topic code across session frontmatter, validate matching `topics:` tags, and read matching Handoffs newest first.
5. Inspect current authoritative code or documents when retention depends on whether a ruling shipped or became discoverable.
6. Stop when evidence supports a disposition. Do not read every tagged Log by default.

Strong path, symbol, task, or issue matches may recover evidence even when no Topic remains in COMMON.

## Apply the Future-Action Test

Ask: **Would omission plausibly cause a future agent to take a different, incorrect action?**

- `KEEP`: current directive or question passes the test and belongs in global context.
- `CONDENSE`: same meaning survives with less text; keep the anchor and rewrite in place.
- `RETIRE`: false, completed, local, self-evident from current artifacts, no longer cross-cutting, or too unlikely to affect future action.
- `REPLACE`: ruling materially changed; allocate a new anchor and redirect only for a live inbound reference.
- `PROMOTE`: reusable failure pattern or durable policy belongs in a permanent document loaded for every relevant host.

Promotion is not required before retirement. Topic tags and targeted archive search are valid recovery routes for retired subsystem knowledge.

## Classify Decisions by Residency

- **Temporary directive**: keep with `RECHECK: <concrete event>` while it binds.
- **Durable guardrail**: keep only when non-obvious, cross-cutting, and likely to prevent a plausible wrong action. Omit `RECHECK` when no concrete invalidation event exists.
- **Settled implementation**: retire after shipment when code, tests, or an authoritative specification makes the behavior discoverable.
- **Historical rationale**: retain in the session Log only.

A durable decision does not earn permanent COMMON residency. Keep a shipped negative decision only when the rejected alternative remains plausible and would violate a product, security, compatibility, migration, or cross-system boundary.

## Remove Low-Value Text

Delete text that reports:

- who decided, reviewed, or discovered something;
- when a decision occurred, unless the date changes behavior or triggers recheck;
- why an alternative lost, unless the cause is an applicability condition;
- deliberation, chronology, debugging narrative, or rejected approaches;
- shipped, done, open, branch, commit-count, pipeline, or readiness status;
- test counts, reviewer anecdotes, dead hashes, and completed issue lists;
- exhaustive provenance when decisive source sessions suffice;
- summaries that follow an authoritative pointer.

Convert causal rationale into a condition only when it changes behavior. Replace “use X because Y” with “use X” or “use X when Y.”

Retire “feature uses X instead of Y” after shipment when artifacts make X self-evident. Preserve a direct prohibition only when Y remains a credible harmful choice.

Preserve negation, quantities, scope, triggers, exceptions, accepted risks, migration boundaries, version constraints, identifiers needed to act, and concrete `RECHECK` events.

## Rewrite Densely

- Keep one subject per entry; classify unrelated companion clauses independently.
- When splitting, keep the old anchor only on a surviving clause that preserves its primary meaning. Allocate new anchors for other surviving clauses. If no clause preserves the meaning, retire the old anchor and allocate new anchors for every survivor.
- Collect the retained, retired, and newly anchored clauses for one `split:` Log entry. Add a Redirect only when a live non-archive reference still uses the old anchor.
- State directive, scope, trigger, exception, and recheck. Omit the argument.
- Prefer one decisive source session over a development-history range.
- Challenge every entry over 40 words for mixed subjects, duplicated authority, rationale, or runbook content. Length is a review trigger, not a hard limit.
- Collect each semantic retirement, replacement, or promotion by anchor and reason. Wording-only condensation needs no Log entry.

## Rebuild Topics as Forward Routes

Use stable, human-readable topic codes:

```markdown
- auth: OIDC, Authentik, accounts, credentials, and session lifecycle
```

Session frontmatter owns the forward index:

```yaml
topics: [auth, deployment]
```

- Never list session ids in COMMON Topics.
- Describe subsystem scope and useful search vocabulary, not current state.
- Keep codes stable; update descriptions without rewriting finalized sessions.
- Retrieve sessions by grepping the code in session frontmatter, then read matching Handoffs and targeted Log passages.
- Delete inactive Topic definitions. Historical session tags remain valid and searchable.

For a legacy Topic that lists session ids:

1. Treat the ids as migration input, not text to retain.
2. Check each named session's Handoff or targeted Log evidence for contradiction. When evidence is absent, the legacy index itself is sufficient for mechanical migration; when evidence contradicts relevance, exclude that session and record why.
3. Mechanically add the stable code to included sessions' frontmatter when absent; never edit their Logs or Handoffs.
4. Collect migrated and excluded session ids for the completed compaction checkpoint.
5. Replace the legacy line with code plus scope/search description.

## Finish

1. Search live non-archive files for inbound references before deleting a Redirect.
2. Verify every retained entry intrinsically belongs in global context. Retire subsystem-only facts only when artifacts or topic-tagged archive evidence make recovery adequate; the current session's subsystem is never evidence for retirement.
3. Append one batched Log update for all collected semantic changes and Topic migrations.
4. Recount COMMON and aim below its target, not merely below hard.
5. Check that condensation preserved every behavior-changing condition and exception.
6. If still above target, report each blocking entry and why it cannot be reduced safely. Never use a blanket “nothing else can be compacted” claim.
