# Test Type Rules

---

## Unit Tests

**Purpose:** Prove that business logic, validation rules, and calculations are correct. All edge cases belong here — unit tests are cheap to run and easy to isolate.

**What belongs here:**
- Validation functions: test every rule, every rejection reason
- Calculation logic: test exact numeric results, boundary values
- Service functions with branching: test every branch
- Exception-raising logic: test every condition that should raise

**What does NOT belong here:**
- Anything requiring a database, network, or file system
- Framework/ORM behavior (see Test Value Gate)

**Edge case checklist:** For every function, ask:
- Zero, empty, `None`/`null`, negative values
- Exact boundary (e.g., amount == available, not amount > available)
- Invalid type or shape of input
- All enum/variant values exercised
- Combinations of valid inputs that create conflicts

**Mocking:** Mock at the boundary — external services, I/O. Do NOT mock the unit under test or its direct collaborators if they're pure functions.

**Pattern:**
```python
def test_sell_exceeds_available_raises():
    # Arrange
    lot = Lot(available=100)
    # Act + Assert
    with pytest.raises(ValidationError, match="exceeds available"):
        create_sell_entry(lot, quantity=101)
```

---

## API Tests

**Purpose:** Prove the HTTP contract — correct status codes, response shape, authentication, and authorization.

**What belongs here:**
- Status code for happy path
- Response body shape (key fields present, correct types)
- Validation errors return correct codes (422 for schema, 400 for business rule)
- Authentication: unauthenticated → 401
- Authorization: user accessing another user's resource → 404
- Duplicate/conflict → 409

**What does NOT belong here:**
- Business logic edge cases (those belong in unit)
- DB constraints (those belong in integration)

**Per-endpoint minimum (required):**
1. Happy path: correct status + response shape
2. Error path: one validation or business rule rejection
3. Ownership: second user gets 404

**Do not** create a new test per validation rule — that's unit test territory. One error case at the API layer is enough to prove the endpoint is wired up.

**Pattern:**
```python
async def test_create_buy_entry_returns_201(async_client, journal_test_data):
    # Arrange
    payload = {...}
    # Act
    resp = await async_client.post("/journal/entries", json=payload)
    # Assert
    assert resp.status_code == 201
    data = resp.json()
    assert "entry_key" in data
    assert data["entry_type"] == "BUY"

async def test_create_buy_entry_wrong_user_returns_404(async_client_b, existing_entry):
    resp = await async_client_b.get(f"/journal/entries/{existing_entry.key}")
    assert resp.status_code == 404
```

---

## Integration Tests

**Purpose:** Prove that components interact correctly — DB constraints, triggers, cross-service calls. Use only when unit tests can't capture the behavior.

**What belongs here:**
- DB-level constraints (unique, FK, NOT NULL) that enforce app-specific rules
- DB triggers or computed columns
- Behaviors that require committed data (vs. transaction-scoped sessions)
- Cross-service calls where both sides matter

**What does NOT belong here:**
- Anything a unit test can cover
- HTTP contracts (those are API tests)

**When to use a committed session:** If the behavior only manifests after a `COMMIT` (e.g., triggers, deferred constraints), use a commit-capable session fixture. Otherwise prefer the rollback-based session — it's faster and leaves no state.

**Pattern:**
```python
def test_duplicate_bank_ref_raises_integrity_error(db_session_commit, user_key):
    create_transaction(db_session_commit, bank_ref="REF-001", user_key=user_key)
    with pytest.raises(IntegrityError):
        create_transaction(db_session_commit, bank_ref="REF-001", user_key=user_key)
```

---

## E2E Tests (Playwright / Browser)

**Purpose:** Prove that user-facing workflows work end-to-end — form submission, API call, UI feedback.

**What belongs here:**
- Full create/edit/delete workflows: form → API → success feedback + list update
- Navigation + data binding: click row → detail page shows correct data
- Stateful interactions: bulk select → apply → state clears
- Error flows via form: submit invalid data → error visible in UI

**What does NOT belong here (anti-patterns):**
- Page loads → heading visible (smoke test, catches nothing)
- Empty state visible when no data (tests Jinja2/template conditional)
- Modal opens when button clicked (tests Alpine `x-show`)
- Navigation link is present on page (tests HTML)
- Section/component visible on page (DOM existence, not behavior)
- Any assertion that would pass even if the data were wrong

**Workflow vs. existence:** The test must verify that the right *data* appeared, not just that something appeared.
- ❌ "entry row is visible"
- ✅ "entry row shows the counterparty name that was submitted"

**Per-form minimum:**
1. Happy path: submit valid data → success toast + correct item in list
2. Error path: submit invalid data → error message visible in UI

**Shared component rule:** If the same component appears on multiple pages, test it on the primary page only.

**Do NOT use TDD for E2E.** Playwright needs a real running DOM — a missing element produces "locator not found" not a meaningful RED. Implement the template first, then write the test, then verify it passes.

**Test isolation:** Each test must create its own user and data via per-test setup helpers — never share data between tests. Parallel test execution makes shared state cause intermittent failures.

**Pattern:**
```typescript
test("create buy entry shows in entry list", async ({ page, testAPI }) => {
  // Arrange
  const { asset } = await testAPI.createTestBuyEntry();
  
  // Act
  await page.goto("/journal");
  await page.getByRole("button", { name: "New Entry" }).click();
  await page.getByLabel("Asset").fill(asset.code);
  // ... fill form ...
  await page.getByRole("button", { name: "Submit" }).click();
  
  // Assert
  await expect(page.getByText("Entry created")).toBeVisible();
  await expect(page.getByRole("row", { name: asset.code })).toBeVisible();
});
```

---

## Frontend Unit Tests (Vitest)

**Purpose:** Test TypeScript logic in isolation — utilities, composables, formatters, state calculations.

**What belongs here:**
- Pure functions: formatters, calculators, transformers
- Composable/hook logic: state transitions, computed values
- Validation logic on the frontend side

**What does NOT belong here:**
- DOM rendering (use E2E for that)
- API calls (mock them at the boundary)
- Framework behavior (Vue reactivity, React lifecycle)

**Pattern:**
```typescript
describe("formatCurrency", () => {
  it("formats positive amount with symbol", () => {
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
  });

  it("formats negative amount with minus sign", () => {
    expect(formatCurrency(-50, "USD")).toBe("-$50.00");
  });

  it("returns dash for null input", () => {
    expect(formatCurrency(null, "USD")).toBe("—");
  });
});
```

---

## Security: Coverage Checklist

Security cases are not a separate layer — integrate them as explicit test cases within the layers above.

| Security concern | Where to test | What to assert |
|---|---|---|
| Unauthenticated request | API | → 401 |
| Invalid / expired token | API | → 401 |
| User accessing another user's resource | API | → 404 (not 403 — avoid resource enumeration) |
| Privileged action by unprivileged user | API | → 403 |
| SQL / command injection inputs | Unit (validation fn) | → rejected or sanitized |
| HTML / script injection in stored fields | Unit (sanitization fn) | → stripped or escaped |
| Malformed / out-of-bounds input | Unit | → correct exception |
| DB row-level access controls | Integration | → enforced on commit |

