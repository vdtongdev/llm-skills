---
name: testing-code
description: Use whenever test-related work is in play — writing new tests, debugging failing ones, reviewing test coverage, organizing test files, or planning what to test for a feature. Auto-triggers on any of: "write a test", "add test coverage", "this test is failing", "what should I test", "test this endpoint", "TDD", "unit test", "E2E test", "check coverage", or when implementing a feature that needs tests. Do not wait to be asked explicitly — if tests are part of the work, use this skill.
---

# Testing Code

## Load Project Config

Check for a `testing-code` section in the project instructions under `SKILL CONFIGURATION`. It should specify:

- **Testing doc** — project commands, file paths, fixtures, domain invariants
- **Backend inventory** — tracks existing backend tests
- **Frontend inventory** — tracks existing frontend/E2E tests
- **Antipattern docs** — paths to project test-antipattern files (test smells to avoid). If none configured, check for `context/ANTIPATTERNS_TESTING.md` as the default; if that is absent too, skip the antipattern cross-reference

If no config exists, check for `context/TESTING.md` as the default testing doc.

### Inventory Check

Verify inventory file(s) exist before writing any test.

- **Not specified in config** → default to `context/TEST_INVENTORY_BACKEND.md` and `context/TEST_INVENTORY_FRONTEND.md`
- **File doesn't exist** → ask user where to create it, or offer to create at the default path using `references/templates/TEST_INVENTORY-template.md`
- **No testing doc at all** (new project) → offer to create from `references/templates/TESTING-template.md` before continuing; gather project details first (test runner, framework, directory layout, key invariants)

---

## Test Value Gate

Answer all four before writing a test. Any NO → don't write it.

- [ ] **Tests my code, not the framework?**
  - ❌ `query(Model).filter_by(pk=1)` → assert found (tests ORM)
  - ❌ `Model(field=None)` → IntegrityError on NOT NULL (tests DB engine)
  - ❌ Page loads → heading visible (tests Playwright/Jinja2/React rendering)
  - ✅ Business rule violation → correct exception/error type
  - ✅ App-specific constraint violation → correct status code
- [ ] **Can a real bug hide without this test?** "Heading is visible" catches nothing. "Heading shows counterparty name" catches broken data binding.
- [ ] **Not already covered at a lower layer?** Check inventory. If covered by unit test, skip API test for same case.
- [ ] **Not a placeholder?** No empty test files "for later." Tests arrive with code.

---

## General Rules (All Test Types)

### Structure

- **AAA**: Arrange (set up data) → Act (call code) → Assert (verify result). Each section should be clear, ideally with blank-line separation.
- **One behavioral intent per test.** The name describes a behavior, not an implementation detail. `test_sell_exceeds_lot_raises_error` > `test_sell_validation`.
- **No branching in test bodies.** No `if`, `for`, or `try/except` in the test itself. Each branch is its own test case.
- **Explicit over implicit.** Hard-code expected values rather than recomputing them in the assertion — you want to catch regressions, not pass by construction.

### Reliability

- **Deterministic.** Same result every run, every environment.
- **Isolated.** No shared mutable state between tests. No dependency on test order.
- **No real time.** Don't use `sleep` or wall-clock assertions — control time explicitly.
- **No environment assumptions.** Don't assume pre-existing state (seeded records, running services, specific env vars).

### Coverage

- Each behavior tested once at the appropriate layer — not duplicated across layers.
- Check inventory before writing to avoid duplication.
- Update inventory after writing.

### TDD (where it applies)

```
1. RED    — write the failing test, run it, confirm it fails for the right reason
2. GREEN  — write the minimal code to make it pass
3. REFACTOR — clean up; tests stay green
```

TDD applies to: unit, API, integration, and frontend unit layers.
TDD does NOT apply to E2E — Playwright needs a real running DOM. Write-and-verify instead: implement the UI element, then write and run the test.

### Test Maintenance

After changing code logic, follow this sequence:

1. Search inventory for all tests touching changed functions/endpoints
2. Read those tests — still valid? Right behavior?
3. Remove tests asserting old behavior
4. Update tests whose assertions need to change
5. Add tests for new branches/behaviors introduced
6. Deduplicate: same behavior at multiple layers → keep the lowest appropriate layer
7. Update inventory

---

## Layer Selection

**Pick the right layer first.** Using a higher layer for something a lower layer can cover wastes build time, slows CI, and hides real failures behind infrastructure noise.

| What you're testing | Layer |
|---|---|
| Business logic, validation rules, calculations | Unit |
| HTTP contract (status codes, response shape, auth) | API |
| DB constraints, triggers, multi-service interaction | Integration |
| Full user workflow: form → API → UI feedback | E2E |
| TypeScript logic: utilities, composables, formatters | Frontend unit |

Full layer details and examples → `references/test-types.md`.

---

## Anti-Patterns

**Read `references/anti-patterns.md` before writing or reviewing tests.** Also read the project's testing doc for stack-specific anti-patterns.

| Section | Key traps |
|---|---|
| Data Isolation | Position-based selection, non-unique identifiers, seeded data reliance, missing cleanup |
| Waiting and Synchronization | `networkidle`, fixed-duration waits, imperative locators, transient state testing, async init |
| UI Interaction | Missing visibility waits, broad selectors, viewport assumptions, browser back/forward |
| Assertions | Magic values, multi-status-code acceptance, OR conditions, inline cleanup |
| Test Execution | Dumping output to stdout, guessing pagination quantities |

---

## Test Planning Checklist

1. **Read the code under test** — inputs, outputs, branches, side effects
2. **Check inventory** — already covered at this or a lower layer?
3. **Read anti-patterns** — `references/anti-patterns.md` + project-specific anti-patterns. Prevents writing tests that are flaky, slow, or broken by known traps.
4. **Run the Test Value Gate** above
4. **Enumerate cases** for every function/endpoint:

| Question | Example |
|---|---|
| Happy path? (one per behavior) | Valid input → 201, correct response body |
| Zero / empty / negative input? | quantity=0 → 422 |
| Referenced entity doesn't exist? | entity_key=999 → 400 |
| Referenced entity in terminal state? | Resource in closed/cancelled state → 400 |
| User doesn't own this resource? | User B GETs User A's data → 404 |
| Operation already done? | Re-submit same operation → skipped/409 |
| Two valid inputs conflict? | Duplicate unique code → 409 |
| Pagination boundary? | limit=0 → 422, offset > total → empty |
| All enum variants covered? | Enumerate every variant explicitly |
| Domain invariant touched? | See project testing doc |

6. **Select layer** for each case (one layer per case)
7. **Write tests** (TDD where applicable)
8. **Update inventory**

---

## API Completeness Check

Every API endpoint needs at minimum:

- [ ] One happy-path test (status code + response shape)
- [ ] One error test (validation or business rule)
- [ ] One ownership/RLS test (second user → 404 or 403)

Audit: compare endpoint definitions against inventory. An untested endpoint is a latent bug.

---

## Security Coverage

Security coverage = specific cases within existing layers, not a separate test file or layer. Enumerate during test planning, not as an afterthought.

See `references/test-types.md` § Security for the full checklist.

---

## Domain Invariants

The project's testing doc should list invariants specific to the app's business logic — behaviors that are always true and must be covered whenever related code is touched.

**If the project has no invariant list yet:** surface this during first test write for domain-critical logic. Ask the user to enumerate the invariants that must never break.

---

## New Project Initialization

If no testing doc or inventory exists:

1. Read `references/templates/TESTING-template.md`
2. Ask the user:
   - What test runner / framework?
   - Where do tests live (directory structure)?
   - What are the key business invariants that must never break?
   - What fixtures or helpers already exist?
3. Fill in the template, save to `context/TESTING.md`
4. Create inventory files from `references/templates/TEST_INVENTORY-template.md`
5. Add to the project instructions under `SKILL CONFIGURATION`:
   ```
   **`testing-code`:**
   - Testing doc: `context/TESTING.md`
   - Backend inventory: `context/TEST_INVENTORY_BACKEND.md`
   - Frontend inventory: `context/TEST_INVENTORY_FRONTEND.md`
   ```
