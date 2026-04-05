# PRD Template

Use this structure when writing a PRD. Sections are examples — adapt to your project's domain. Not every PRD needs every section.

## Template

```markdown
# PRD: <Feature Name>

## Overview
What and why. Issue/ticket reference if applicable.

## Current State
What exists today. Reference exact files and functions.

## Requirements

### <Domain Section 1> (e.g., Backend, API, Data Pipeline)
- Endpoint specs / interface specs (URL, method, request/response schemas with examples)
- Query logic / processing logic
- Where to put code (new files, modifications to existing)

### <Domain Section 2> (e.g., Frontend, CLI, Worker)
- Component structure / command structure
- Data flow (which API methods, which state)
- User-facing behavior

## Out of Scope
Explicit boundaries. What this feature does NOT do.

## Implementation Details

### Files to Create
- `path/to/file.py` — purpose

### Files to Modify
- `path/to/file.py: function_name()` — what to change and brief why

### Files to Delete
- `path/to/old_file.py` — why it's no longer needed

### Test Plan
- Test cases (input -> expected status + response/result)
- E2E / integration test cases (action -> expected outcome)
- Fixtures to use or create

### Patterns to Follow
- "See `path/to/example.py` for similar pattern"
```

## Detail Level for File Changes

The right level of detail depends on the type of change:

### New code — specify the interface

```markdown
`backend/routers/dashboard.py`: new async endpoint `get_mtd_summary(db) -> MtdSummaryResponse`
  - joins journal_entry_fact + journal_line_fact + account_dim
  - filters: entry_type IN (INCOME, EXPENSE), current month, amount > 0
  - groups by: entry_type, currency
```

### Modifications — specify what + brief why

```markdown
`backend/main.py`: register dashboard router
  Why: new router file, needs to be included in the app

`frontend/src/components/dashboard.ts`: add `loadMtdSummary()`, computed getters
  `mtdRevenueByCurrency`, `mtdExpensesByCurrency`, `mtdNetByCurrency`
  Why: follows existing `assetsByCurrency` pattern for multi-currency display
```

### Removals — specify what + brief why

```markdown
`frontend/src/components/old_widget.ts`: delete file
  Why: replaced by new_widget.ts, no other imports
```

Don't add "why" everywhere — only where the reason isn't obvious from context.
