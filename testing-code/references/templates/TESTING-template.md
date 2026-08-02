# Testing Instructions

<!-- PROJECT-SPECIFIC: Fill in this file for your project. This is consumed by the testing-code skill. -->

---

## Running Tests

**Use [TODO: Makefile / npm scripts / etc.] targets where available.**

**Pipe output to file, then search — avoid flooding context.**

### Quick Reference

```bash
# TODO: Add your project's test commands
# Examples:

# Full CI pipeline
make ci-all

# Individual suites
make test-backend       # backend tests only
make test-e2e           # E2E tests only
```

### [TODO: Frontend Unit Tests, if applicable]

```bash
# TODO: e.g., cd frontend && npm run test -- --run
```

---

## Test File Structure

<!-- Tell the testing-code skill where tests live in this project -->

| Layer | Location | Runs via |
|---|---|---|
| Unit | `TODO: path/to/unit/tests/` | TODO |
| API | `TODO: path/to/api/tests/` | TODO |
| Integration | `TODO: path/to/integration/tests/` | TODO |
| E2E | `TODO: path/to/e2e/specs/` | TODO |
| Frontend unit | `TODO: path/to/frontend/tests/` | TODO |

---

## Available Fixtures

### Backend

<!-- Document shared fixtures that tests should reuse -->

| Fixture | Purpose |
|---|---|
| TODO | TODO |

### Frontend / E2E

| Fixture / Helper | Purpose |
|---|---|
| TODO | TODO |

---

## Domain Invariants

<!-- List business rules that must ALWAYS hold. Tests touching related code must cover these. -->
<!-- These are app-specific — things that would be catastrophic if broken in production. -->

| Invariant | Description | Tested at |
|---|---|---|
| TODO: name | TODO: what must always be true | TODO: unit/api/integration |

**Examples of invariants:** double-entry balance, ownership isolation (user A can't see user B's data), idempotent imports, closed-state rejections.

---

## Anti-Patterns for This Stack

<!-- Project- and stack-specific bad patterns not covered by the generic skill -->
<!-- Delete this section if nothing specific to add -->

- TODO: Add anti-patterns specific to your framework/DB/test setup

---

## Notes

<!-- Anything else the testing-code skill should know about testing in this project -->
<!-- E.g.: "Integration tests require Docker running", "E2E tests need the frontend built first" -->
