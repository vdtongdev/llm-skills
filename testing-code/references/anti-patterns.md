# Testing Anti-Patterns

> Universal patterns that cause flaky, slow, or broken tests. Framework-agnostic where possible; Playwright-specific patterns are labeled.

---

## Data Isolation

### Don't select by position in dynamic lists

Scope: E2E

**Wrong:**

```typescript
// ❌ List order changes when parallel tests create/delete items → wrong item selected
await page.selectOption({ index: 1 });
```

**Right:**

```typescript
// ✅ Select by value — deterministic regardless of list contents
const item = await testHelper.createUniqueItem();
await page.selectOption({ value: item.id.toString() });
```

Why: Parallel tests mutate list contents. Index 1 today is a different item tomorrow.

### Don't rely on pre-existing data in E2E tests

Scope: E2E

**Wrong:**

```typescript
// ❌ Seeded "Default Category" might not be on page 1 (newest-first pagination)
await page.selectOption({ label: 'Default Category' });
```

**Right:**

```typescript
// ✅ Test owns its data
const category = await testHelper.createUniqueCategory();
```

Why: Pagination pushes seeded data off page 1 as tests create new items.

### Don't use non-unique identifiers across tests

Scope: All

**Wrong:**

```typescript
// ❌ Collides across parallel workers and repeated runs
for (let i = 0; i < 25; i++) {
  await api.createItem({ code: `TST${i}` });
}
```

**Right:**

```typescript
// ✅ Unique per run
const prefix = Date.now().toString().slice(-6);
for (let i = 0; i < 25; i++) {
  await api.createItem({ code: `T${prefix}${i}` });
}
```

Why: Without timestamps or random suffixes, codes collide between parallel workers and across runs.

### Don't skip test data cleanup

Scope: All

**Wrong:**

```typescript
// ❌ Data accumulates → slow queries, overflowing dropdowns, shifted pagination
test('should show item', async ({ api }) => {
  await api.createItem({ code: 'TEST' });
  // no cleanup — data persists forever
});
```

**Right:** Use fixture teardown or a global cleanup strategy. Without cleanup, every test must tolerate an arbitrarily large dataset — most don't.

Why: Cascading failures that look unrelated: timeouts, off-screen items, broken count assertions.

---

## Waiting and Synchronization

### Don't use `networkidle` for synchronization

Scope: E2E (Playwright)

**Wrong:**

```typescript
// ❌ Waits for 500ms of no network activity — slow, unreliable, may never resolve
await page.waitForLoadState('networkidle');
```

**Right:**

```typescript
// ✅ Wait for the specific element you care about
await expect(page.getByTestId('result-table')).toBeVisible();
```

Why: Playwright docs discourage it. Adds 500ms minimum latency per use, breaks with background requests (analytics, polling).

### Don't increase timeouts to fix flaky tests

Scope: All

**Wrong:**

```typescript
// ❌ Was 5s, now 15s — masks the real problem
await page.waitForFunction(check, { timeout: 15000 });
```

**Right:**

```typescript
// ✅ Fix root cause, keep fast timeout
await page.waitForFunction(check, { timeout: 3000 });
```

Why: If the fix is correct, operations complete in milliseconds. Long timeouts mean you're waiting for something that may never happen.

### Don't use imperative locator methods for assertions

Scope: E2E (Playwright)

**Wrong:**

```typescript
// ❌ count(), isVisible(), textContent() return a snapshot — no retries
const count = await locator.count();
expect(count).toBeGreaterThan(0);

const text = await locator.textContent();
expect(text).toContain('Success');
```

**Right:**

```typescript
// ✅ expect() assertions auto-retry until condition met or timeout
await expect(locator).not.toHaveCount(0);
await expect(locator).toContainText('Success');
await expect(locator).toBeVisible();
```

Why: Imperative methods (`count()`, `isVisible()`, `textContent()`) snapshot the DOM once. If the framework hasn't re-rendered, the snapshot is stale. Auto-retrying `expect()` polls until the condition holds.

### Don't use fixed-duration waits

Scope: E2E (Playwright)

**Wrong:**

```typescript
// ❌ Arbitrary wait — too slow on fast machines, too short on slow CI
await page.waitForTimeout(1000);
```

**Right:**

```typescript
// ✅ Wait for the condition, not a duration
await expect(toastLocator).toBeVisible();
await expect(modal).not.toBeVisible();
```

Why: Fixed waits are either too long (slow tests) or too short (flaky tests). Event-based waits are both faster and more reliable.

### Don't test transient loading states

Scope: E2E

**Wrong:**

```typescript
// ❌ Inject artificial delay to "catch" the spinner — inherent race condition
await page.route('**/api/resource', async route => {
  await new Promise(resolve => setTimeout(resolve, 300));
  await route.continue();
});
await expect(spinner).toBeVisible();
```

**Right:**

Don't. Loading spinners appear for milliseconds on fast backends. Test the *outcome* (toast, data created, modal closed), not the intermediate state.

Why: Transient UI states exist for <100ms on fast systems. Artificial delays create a race between the delay expiring and the assertion polling.

---

## UI Interaction

### Don't skip visibility waits after triggering modals

Scope: E2E

**Wrong:**

```typescript
// ❌ Returns immediately — caller interacts with invisible modal
async openCreateModal(): Promise<void> {
  await this.createButton.click();
}
```

**Right:**

```typescript
// ✅ Wait for modal to be interactive
async openCreateModal(): Promise<void> {
  await this.createButton.click();
  await this.modal.waitFor({ state: 'visible' });
}
```

Why: Modal animation takes time. Without the wait, subsequent interactions run before the modal is visible.

### Don't use broad selectors for containers

Scope: E2E

**Wrong:**

```typescript
// ❌ Matches any div containing the text — could be parent, breadcrumb, or button
this.container = page.locator('div').filter({ hasText: title }).first();
```

**Right:**

```typescript
// ✅ Use semantic selectors
this.container = page.locator('[role="dialog"]').filter({ hasText: title });
```

Why: `.first()` masks ambiguity. The wrong container makes all interactions within it fail silently.

### Don't assume locators resolve the same element across viewports

Scope: E2E (responsive layouts)

**Wrong:**

```typescript
// ❌ Desktop element is first in DOM but hidden on mobile (hidden md:block)
await expect(page.getByText(code).first()).toBeVisible();
```

**Right:**

```typescript
// ✅ Check visibility across all matches
const matches = page.getByText(code);
const count = await matches.count();
let visible = false;
for (let i = 0; i < count; i++) {
  if (await matches.nth(i).isVisible()) { visible = true; break; }
}
expect(visible).toBeTruthy();
```

Why: Responsive layouts render data in multiple DOM locations (table for desktop, cards for mobile). `.first()` picks DOM order, not visibility.

### Don't interact with inputs before async component initialization

Scope: E2E (async-init frameworks)

**Wrong:**

```typescript
// ❌ API response received, but the component hasn't finished initializing
await page.goto('/items');
await page.waitForResponse('**/api/items');
// Date picker / rich editor / dropdown initializes AFTER the fetch → overwrites your input
await page.fill('[data-testid="date-filter"]', '2024-01-01');
```

**Right:**

```typescript
// ✅ Wait for the component to finish initializing
await page.goto('/items');
await page.waitForResponse('**/api/items');
await page.waitForFunction(
  (sel) => document.querySelector(sel)?.classList.contains('initialized'),
  '[data-testid="date-filter"]',
);
await page.fill('[data-testid="date-filter"]', '2024-01-01');
```

Why: HTTP response ≠ DOM ready. Async components (date pickers, rich editors, API-fed dropdowns) initialize after the fetch resolves. Filling inputs during that gap gets overwritten silently.

### Don't use browser back/forward for navigation assertions

Scope: E2E

**Wrong:**

```typescript
// ❌ History stack is fragile — polluted by redirects and parallel tests
await page.goBack();
await expect(pageInfo).toContainText('Page 1');
```

**Right:**

```typescript
// ✅ Navigate explicitly — deterministic
await page.goto('/items?page=1');
await expect(pageInfo).toContainText('Page 1');
```

Why: `page.goBack()` depends on the browser history stack, which is unreliable in parallel test runs.

---

## Assertions

### Don't use magic values as identifiers

Scope: All

**Wrong:**

```python
# ❌ Depends on state test doesn't own
response = await client.get("/api/items?owner_id=1")
entry = session.query(Entry).filter_by(user_id=1).one()
```

**Right:**

```python
# ✅ Test owns its data
user = UserFactory()
response = await client.get(f"/api/items?owner_id={user.id}")
entry = session.query(Entry).filter_by(user_id=user.id).one()
```

Why: Fixed values depend on seeded data, other tests, or migration state. Tests that own their data run in any order.

### Don't accept multiple status codes in one assertion

Scope: API tests

**Wrong:**

```python
# ❌ Passes regardless of which behavior the API implements
assert response.status_code in [200, 422]
```

**Right:**

```python
# ✅ Assert the one correct behavior
assert response.status_code == 422
```

Why: Accepting both means the test can't catch regressions — it passes no matter what.

### Don't use OR in assertion conditions

Scope: All

**Wrong:**

```python
# ❌ Passes even if count is wrong
assert "3" in detail or "transaction" in detail.lower()
```

**Right:**

```python
# ✅ Assert each condition independently
assert "3" in detail
assert "transaction" in detail.lower()
```

### Don't do inline cleanup that skips on failure

Scope: All

**Wrong:**

```typescript
// ❌ If assertion fails, cleanup never runs
await expect(something).toBe(true);
await api.deleteItem(item.id);  // skipped on failure
```

**Right:** Use `afterEach` or fixture teardown — runs even on failure.

---

## Test Execution

### Don't dump test output to stdout

Scope: All

**Wrong:**

```bash
# ❌ Floods context with 100+ lines
pytest tests/ -v
npx playwright test
```

**Right:**

```bash
# ✅ Pipe to file, then search
pytest tests/ -v > ./tmp/pytest.txt 2>&1
rg "FAILED|ERROR" ./tmp/pytest.txt || echo "All passed"
```

### Don't calculate data quantities by guessing

Scope: All (pagination tests)

**Wrong:**

```typescript
// ❌ Page size is 20 → only 1 page → Next button disabled → test fails
for (let i = 0; i < 15; i++) { await api.createItem({ ... }); }
await nextButton.click();
```

**Right:**

```typescript
// ✅ Calculate: items > (N-1) * pageSize for page N
for (let i = 0; i < 25; i++) { await api.createItem({ ... }); }
await nextButton.click(); // page 2 exists
```

Why: `totalPages = Math.ceil(items / pageSize)`. Guessing leads to off-by-one pagination failures.
