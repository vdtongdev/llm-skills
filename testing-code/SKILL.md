---
name: testing-code
description: 'Use whenever test-related work is in play - writing new tests, debugging failing ones, reviewing test coverage, organizing test files, or planning what to test for a feature. Auto-triggers on any of: "write a test", "add test coverage", "this test is failing", "what should I test", "test this endpoint", "TDD", "unit test", "E2E test", "check coverage", or when implementing a feature that needs tests. Do not wait to be asked explicitly - if tests are part of the work, use this skill.'
---

# Testing Code

## Load Project Config

Check for a `testing-code` section in the project instructions under `SKILL CONFIGURATION`. It should specify:

- **Testing doc** - project commands, file paths, fixtures, domain invariants. Defaults to `context/TESTING.md`.
- **Test registry** - `.test-registry/`, queried with the bundled `testmap` CLI. It records what each test file covers and what is known to be missing.
- **Anti-patterns** - if the project has `.antipatterns/`, recall through the `antipatterning` skill. Otherwise check for `context/ANTIPATTERNS_TESTING.md`; if that is absent too, skip the cross-reference.

If the project has no `.test-registry/config.yaml`, see [New Project Initialization](#new-project-initialization). Do not create it silently.

---

## Registry Workflow

The registry is the coverage map. Source is still authoritative for what a test asserts; the registry tells you which files to open. Run from the project root, full reference in `references/registry-format.md`:

```bash
~/.agents/skills/testing-code/bin/testmap select \
  --path backend/services/enrollment_service.py --topic authorization
```

### Before test work

1. Run `testmap select` against every relevant production path, topic, and layer. Selectors are repeatable and results are a union.
2. Read what comes back: the selected records, any gaps, the test source itself, the project testing doc, and the anti-pattern guidance for the same paths.
3. Apply the [Test Value Gate](#test-value-gate) and choose the lowest suitable layer.

If `select` returns `incomplete: true`, a record was skipped as damaged and its test file is invisible to the query. Run `testmap validate` before concluding coverage is missing.

### After changing coverage

Run this after creating, deleting, renaming, or changing any test.

1. Update the affected test-file record. Delete the record when you delete its file; move it when you rename one.
2. Update gap records that the change opens or closes.
3. Run `testmap validate`. Exit 0 or fix what it reports.
4. Re-run `testmap select` against every changed production path, read the selected test source, and confirm each summary is still true.

Step 4 is not optional busywork. Validation checks that files and targets exist; it cannot read prose. A summary describing coverage the file no longer has passes clean, and that is the exact failure this registry replaced. This re-read is the only control for it.

---

## Test Value Gate

Answer all four before writing a test. Any NO means don't write it.

- [ ] **Tests my code, not the framework?** Bad: `filter_by(pk=1)` finds the row (tests the ORM); NOT NULL raises IntegrityError (tests the DB engine); page loads and heading is visible (tests the renderer). Good: a business rule violation produces the correct exception type or status code.
- [ ] **Can a real bug hide without this test?** "Heading is visible" catches nothing. "Heading shows counterparty name" catches broken data binding.
- [ ] **Not already covered at a lower layer?** Run `testmap select` on the production path. If a unit test covers the case, skip the API test for it.
- [ ] **Not a placeholder?** No empty test files "for later". Tests arrive with code.

---

## General Rules (All Test Types)

### Structure

- **AAA**: Arrange (set up data), Act (call code), Assert (verify result). Separate the sections with blank lines.
- **One behavioral intent per test.** The name describes a behavior, not an implementation detail. `test_sell_exceeds_lot_raises_error` beats `test_sell_validation`.
- **No branching in test bodies.** No `if`, `for`, or `try/except` in the test itself. Each branch is its own test case.
- **Explicit over implicit.** Hard-code expected values rather than recomputing them in the assertion. You want to catch regressions, not pass by construction.

### Reliability

- **Deterministic.** Same result every run, every environment.
- **Isolated.** No shared mutable state between tests. No dependency on test order.
- **No real time.** Don't use `sleep` or wall-clock assertions. Control time explicitly.
- **No environment assumptions.** Don't assume pre-existing state (seeded records, running services, specific env vars).

### Coverage

- Each behavior tested once at the appropriate layer, not duplicated across layers.
- Query the registry before writing, to avoid duplication.
- Update the registry after writing.

### TDD (where it applies)

```
1. RED      - write the failing test, run it, confirm it fails for the right reason
2. GREEN    - write the minimal code to make it pass
3. REFACTOR - clean up; tests stay green
```

TDD applies to unit, API, integration, and frontend unit layers. It does NOT apply to E2E: Playwright needs a real running DOM. Write-and-verify instead, implementing the UI element before writing and running the test.

### Test Maintenance

After changing code logic:

1. Run `testmap select --path <changed path>` to find every test file touching it.
2. Read those tests. Still valid? Right behavior?
3. Remove tests asserting old behavior.
4. Update tests whose assertions need to change.
5. Add tests for new branches and behaviors.
6. Deduplicate: same behavior at multiple layers, keep the lowest appropriate one.
7. Run the [After changing coverage](#after-changing-coverage) sequence.

---

## Layer Selection

**Pick the right layer first.** Using a higher layer for something a lower layer can cover wastes build time, slows CI, and hides real failures behind infrastructure noise.

| What you're testing | Layer |
|---|---|
| Business logic, validation rules, calculations | Unit |
| HTTP contract (status codes, response shape, auth) | API |
| DB constraints, triggers, multi-service interaction | Integration |
| Full user workflow: form to API to UI feedback | E2E |
| TypeScript logic: utilities, composables, formatters | Frontend unit |

Full layer details and examples: `references/test-types.md`.

---

## Anti-Patterns

**Read `references/anti-patterns.md` before writing or reviewing tests.** It covers data isolation, waiting and synchronization, UI interaction, assertions, and test execution.

For project-specific traps, recall through the project's anti-pattern registry as described in [Load Project Config](#load-project-config). Registry records may link `AP-NNN` ids in `anti_patterns`; read those entries, don't restate their rules in the record.

---

## Test Planning Checklist

1. **Read the code under test** - inputs, outputs, branches, side effects.
2. **Run `testmap select`** on the production paths and topics. Already covered at this or a lower layer? Is there a gap record for it already?
3. **Read anti-patterns** - `references/anti-patterns.md` plus project recall. Prevents writing tests that are flaky, slow, or broken by known traps.
4. **Run the Test Value Gate.**
5. **Enumerate cases** for every function or endpoint:

| Question | Example |
|---|---|
| Happy path? (one per behavior) | Valid input, 201, correct response body |
| Zero / empty / negative input? | quantity=0, 422 |
| Referenced entity doesn't exist? | entity_key=999, 400 |
| Referenced entity in terminal state? | Resource closed or cancelled, 400 |
| User doesn't own this resource? | User B GETs User A's data, 404 |
| Operation already done? | Re-submit same operation, skipped or 409 |
| Two valid inputs conflict? | Duplicate unique code, 409 |
| Pagination boundary? | limit=0, 422; offset > total, empty |
| All enum variants covered? | Enumerate every variant explicitly |
| Domain invariant touched? | See project testing doc |

6. **Select layer** for each case, one layer per case.
7. **Write tests** (TDD where applicable).
8. **Run the [After changing coverage](#after-changing-coverage) sequence.**

---

## API Completeness Check

Every API endpoint needs at minimum:

- [ ] One happy-path test (status code plus response shape)
- [ ] One error test (validation or business rule)
- [ ] One ownership/RLS test (second user gets 404 or 403)

Audit by comparing endpoint definitions against `testmap select --layer api`, matching on `endpoint` targets. An untested endpoint is a latent bug. Record confirmed holes as gaps.

---

## Security Coverage

Security coverage means specific cases inside existing layers, not a separate test file or layer. Enumerate during test planning, not as an afterthought. Full checklist: `references/test-types.md`.

---

## Domain Invariants

The project's testing doc should list invariants specific to the app's business logic: behaviors that are always true and must be covered whenever related code is touched.

Registry records may name an invariant with an `invariant` target, which makes `testmap select` able to find its witnesses.

**If the project has no invariant list yet:** surface this during the first test write for domain-critical logic. Ask the user to enumerate the invariants that must never break.

---

## New Project Initialization

If no testing doc or registry exists:

1. Read `references/templates/TESTING-template.md` and `references/registry-format.md`.
2. Ask the user: what test runner or framework, where tests live, which business invariants must never break, and what fixtures or helpers already exist.
3. Fill in the template, save to `context/TESTING.md`.
4. Create `.test-registry/config.yaml` with one suite per test root, then follow the setup steps in `references/registry-format.md` to write a record per existing test file. Open each file before writing its record.
5. Add to the project instructions under `SKILL CONFIGURATION`:
   ```
   **`testing-code`:**
   - Testing doc: `context/TESTING.md`
   - Test registry: `.test-registry/` (query with `testmap`)
   ```
