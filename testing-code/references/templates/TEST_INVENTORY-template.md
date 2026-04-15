# Test Inventory — [Backend / Frontend]

<!-- This file tracks what is tested and where. -->
<!-- Update it when adding, removing, or moving tests. -->
<!-- The /testing-code skill reads this to check coverage before writing new tests. -->

---

## How to Read This File

Each entry covers one function, endpoint, or UI workflow.
- **Layer** — which test layer covers it (unit / api / integration / e2e / vitest)
- **File** — path to the test file
- **Cases** — brief description of what's tested (not the full test name)

---

## [Section: e.g., Authentication]

| Subject | Layer | File | Cases |
|---|---|---|---|
| TODO: function or endpoint | unit | `tests/unit/test_todo.py` | happy path, invalid input, edge case |

---

## [Section: e.g., Journal Entries]

| Subject | Layer | File | Cases |
|---|---|---|---|
| TODO | api | `tests/api/test_todo.py` | 201 happy, 422 validation, 404 RLS |

---

## [Section: e.g., User Workflows (E2E)]

| Subject | Layer | File | Cases |
|---|---|---|---|
| TODO: workflow name | e2e | `tests/specs/todo.spec.ts` | happy path, error state |

---

<!-- Add sections for each domain area of your application -->
<!-- Keep entries current — a stale inventory is worse than no inventory -->
