# Pruning a Test Registry

Use this procedure only for an explicit registry audit or trim. Treat every record and gap as
unreviewed metadata. Executable tests and current production source are authoritative.

## Do Not Write

Remove or rewrite registry content that does any of these:

- Retells test names, setup, assertions, or obvious production behavior.
- Explains testing concepts instead of mapping coverage.
- Preserves deleted tests, superseded bugs, or implementation history.
- Records pass counts, transient status, dates, or line numbers.
- Repeats anti-pattern guidance instead of linking the applicable ID.
- Claims coverage from a filename, test name, or old registry text without reading the test.
- Targets code that the test cannot fail on.
- Names generated output when tracked source owns the behavior.
- Lists every dependency instead of the source responsible for the tested behavior.
- Describes a vague gap such as "needs more coverage" without a concrete missing witness.

Keep a note only when it preserves evidence that cannot be recovered by reading the test and source,
such as an executed mutation result or a non-obvious boundary between test layers.

## Audit Test Records

1. Read `.test-registry/config.yaml` and run `testmap validate`. A damaged record may be absent from
   normal selection output.
2. Inventory every configured test record and gap. Do not infer completeness from `select` alone.
3. For each test record:
   - Read the whole executable test.
   - Open the production source responsible for each claimed behavior.
   - List the observable behaviors that would make this test fail.
   - Verify the layer, topics, path targets, endpoint targets, and invariant targets.
   - Remove targets supported only by narrative association.
   - Identify notes that contain unique evidence rather than explanation.
   - Verify each linked anti-pattern applies to the test's actual failure mode.
4. Classify the record:
   - **KEEP**: concise, true, and correctly routed.
   - **CONDENSE**: true but narrates reconstructable details.
   - **RETARGET**: behavior is accurate but targets are missing or overstated.
   - **REWRITE**: summary or notes materially misstate coverage.
   - **DELETE**: the executable test no longer exists or the record belongs to no configured suite.
5. Record the source evidence for each material correction before editing.

## Audit Gap Records

For each gap:

1. Name the exact behavior that can regress without failing the current suite.
2. Read every selected test that might already witness it.
3. Trace the relevant production branch, response, state transition, or rendered output.
4. Prefer a measured mutation witness when the behavior is load-bearing and mutation is safe.
5. Define what future test would close the gap. The closure condition must be observable.
6. Classify the gap:
   - **KEEP**: concrete, current, and unwitnessed.
   - **REWRITE**: real gap, but vague or inaccurately scoped.
   - **DELETE**: closed, disproved, obsolete, or speculative.

Delete obsolete gaps. Do not keep closed tombstones only for history.

## Apply the Trim

1. Summarize behavioral coverage, not the test's narrative sequence.
2. Keep only targets whose behavior the test can distinguish.
3. Keep notes only for non-reconstructable evidence or important layer boundaries.
4. Delete stale anti-pattern links and obsolete gaps.
5. Add a new gap only after confirming the behavior is both important and currently unwitnessed.
6. Remove live references to deleted records. Preserve immutable historical records according to
   their owning system.

## Verify

Run from the project root:

```bash
~/.agents/skills/testing-code/bin/testmap validate
```

For every changed record:

1. Run `testmap select` with a target, topic, or layer that must retrieve it.
2. Re-read the selected test and relevant production source.
3. Confirm the summary, targets, notes, and anti-pattern links remain true.
4. Search for deleted record and gap IDs. Explain each surviving historical occurrence.
5. Report deleted records and gaps with the source evidence that made them obsolete or false.

Structural validation cannot establish semantic truth. A clean result is not a substitute for the
source reread.

## Self-Evaluation Gate

Do not finish until every answer is YES:

- [ ] Every summary describes observable coverage in the executable test.
- [ ] Every target names source whose behavior the test can distinguish.
- [ ] Every note contains evidence or a boundary not obvious from the test.
- [ ] Every anti-pattern link applies to the test's actual failure mode.
- [ ] Every retained gap names a concrete regression and observable closure condition.
- [ ] Every deleted gap was checked against current tests and source.
- [ ] Removed IDs have no unexplained live references.
- [ ] `testmap validate` passes and changed records survive semantic rereading.
