# Pruning an Anti-Pattern Registry

Use this procedure only for an explicit registry audit or trim. Treat every existing entry as an
unreviewed claim. The registry is not evidence for its own accuracy.

## Do Not Preserve

Delete or replace entries that contain any of these:

- A symptom presented as the root cause.
- A title that does not name the trigger an agent encounters before making the mistake.
- Multiple independent traps joined because they occurred in one incident.
- Generic engineering advice a competent reader already applies.
- A one-time migration lesson with no realistic recurrence.
- A mistake already rejected and explained by a linter, compiler, checker, or enforced workflow.
- A current implementation fact discoverable from the owning code or authoritative document.
- Guidance duplicated by project instructions, another skill, or another entry with the same root.
- Advice contradicted by the cited incident, current source, or measured behavior.
- Backstory, status, or examples required to make incomplete guidance understandable.

Do not keep a retired tombstone only to preserve history. Version control and immutable project
history own deleted content. Keep a tombstone only when the schema, tooling, or owner explicitly
requires one.

## Audit Each Entry

1. Read the whole entry, including provenance, relationships, and encounters.
2. Open the cited evidence. Quote the observed failure and the condition that caused it.
3. Inspect current code, tools, and authoritative instructions that now prevent or explain it.
4. Write the claimed trigger, root cause, consequence, and preferred action in one sentence each.
5. Challenge the claim:
   - Would the title lead an agent to recall this before the mistake?
   - Is the entry naming the cause, or only the visible symptom?
   - Did the evidence demonstrate the rule, or merely suggest it?
   - Could a tool, local comment, or existing instruction own the recall more cheaply?
   - Can the same failure realistically recur in current work?
   - Does another entry express the same root rule?
6. Classify the entry:
   - **KEEP**: accurate and satisfies every fitness criterion.
   - **REWRITE**: durable root rule, but title, scope, or guidance is inaccurate.
   - **MERGE**: another entry has the same root rule.
   - **SPLIT**: one entry contains independent triggers or causes.
   - **DELETE**: false, stale, obvious, one-shot, duplicated, or tool-covered.
7. Record the evidence and reason before editing. Classification without evidence is another
   unreviewed claim.

## Apply the Trim

1. Rewrite retained guidance as complete `avoid`, `prefer`, and `why` fields.
2. Keep examples only when they clarify a non-obvious boundary.
3. Merge duplicate root rules. Split entries only when each result independently passes fitness.
4. Delete entries classified `DELETE`; do not convert them to inactive clutter.
5. Preserve lineage only on surviving replacement entries when it helps future maintenance.
6. Find every reference to removed IDs.
7. Remove live references. If the surrounding artifact still needs the fact, state it locally in
   the smallest self-contained form.
8. Do not rewrite immutable journals or other explicitly historical records. Their references are
   evidence, not active routing.

## Verify

Run from the project root:

```bash
~/.agents/skills/antipatterning/bin/antipattern validate
~/.agents/skills/antipatterning/bin/antipattern topics
```

Then:

1. Search for every removed ID. Explain each surviving historical occurrence.
2. Run `antipattern select` against every changed path and relevant topic.
3. Read the selected guidance. Confirm the trim did not remove a rule still needed by current work.
4. Report every deletion with its evidence and reason. Grouping is allowed only when the entries
   share the same reason and authority.

## Self-Evaluation Gate

Do not finish until every answer is YES:

- [ ] Every retained entry passes all fitness criteria without relying on its own assertions.
- [ ] Every title names one recognizable trigger.
- [ ] Every entry has one root rule and complete short guidance.
- [ ] No entry duplicates a stronger tool, instruction, document, or sibling entry.
- [ ] Every deletion has quoted or directly inspectable evidence.
- [ ] Removed IDs have no unexplained live references.
- [ ] Historical records were preserved according to their owning system.
- [ ] Validation passes, and final selection still returns the rules relevant to changed paths.
