# Finding Output Format

## Per-finding

```
### <ID>. <One-line title> — <SEVERITY>

**File:** `<path>:<line>`
**Pass:** <pass number and name>

**Problem:** <What is wrong. Quote the code if short.>

**Why it matters:** <Consequence if not fixed. One sentence.>

**Suggested fix:** <Concrete fix — drop-in code or clear instruction. Skip if obvious.>
```

ID convention: prefix by category — `S` security, `D` data/logic, `A` API, `F` frontend, `T` tests, `X` cross-cutting, `AP` antipattern. Number within category.

## Summary table

At end of review (or at session handoff):

```
| ID | Title | Severity | File | Blocking? |
|----|-------|----------|------|-----------|
| S1 | CSV upload no size limit | HIGH | journal_entries.py:522 | Yes |
| D1 | Lot count ignores filter | MEDIUM | lots.py:130 | Yes |
| AP1 | ORDER BY in count subquery | MINOR | 4 routers | No |
```

## Deduplication

Same pattern in N places = **one finding** with all locations listed. Never N separate findings.

```
### AP1. ORDER BY in count subqueries — MINOR

**Files:**
- `backend/routers/journal_entries.py:657`
- `backend/routers/counterparties.py:48`
- `backend/routers/accounts.py:63`
- `backend/routers/asset_types.py:76`

**Pass:** 3 — API Surface

**Problem:** `count()` subquery includes `ORDER BY`, ignored by SQL but adds parse cost.

**Suggested fix:** Strip `order_by` from the count query — `select(func.count()).select_from(stmt.order_by(None).subquery())`.
```
