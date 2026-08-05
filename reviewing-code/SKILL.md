---
name: reviewing-code
description: Multi-pass code review of a branch before merge. Use when the user asks for a code review, MR/PR review, security audit, or pre-merge check on a branch or diff. Triggers on "review this branch", "review the MR/PR", "audit before merge", "security review", "look for issues before I merge". Also use proactively before declaring a feature ready for PR.
---

# Reviewing Code

Multi-pass review of a branch's changes. Reads files fully, checks against project antipatterns, produces structured findings with severity. Does not fix — that's a separate task.

May span multiple sessions. Hand off via `journaling-session-memory`.

## Project Configuration

Project instructions may specify:

- **Base branch** — if unset, infer from `git branch -a`. Common conventions: `master → dev → feature`, or `main → feature`. Pick the obvious upstream; ask the user only if multiple plausible bases exist.
- **Antipattern docs** — paths to project antipattern files. If none, skip the antipattern cross-reference step
- **Stack-conditional passes** — e.g., skip Pass 4 if no frontend exists

Read these from the project instructions before Setup.

## Setup

1. Get the changed file list:

   ```bash
   git diff <base>..HEAD --stat
   git log <base>..HEAD --oneline
   ```

2. **Exclude non-source files** from the checklist:
   - Lockfiles (`package-lock.json`, `uv.lock`, `poetry.lock`, `yarn.lock`)
   - Generated bundles, minified assets, compiled output (`dist/`, `build/`, `*.min.js`)
   - Binaries, images, fonts, snapshots
   - Vendored dependencies

   For these, inspect the source/config that produced them if relevant (e.g., `pyproject.toml` change behind a `uv.lock` diff), not the artifact itself.

3. Build a **review checklist** — one `[ ]` per changed file, grouped by pass. Write it to the current session journal file immediately (via `journaling-session-memory`, checkpoint mode). Example:

   ```
   ## Review Checklist

   ### Pass 1 — Security & Auth
   - [ ] backend/dependencies.py
   - [ ] backend/services/auth_service.py

   ### Pass 2 — Business Logic & Antipatterns
   - [ ] backend/services/journal_service.py

   ### Pass 3 — API Surface
   - [ ] backend/routers/journal_entries.py

   ### Pass 4 — Frontend
   - [ ] frontend/src/services/api.ts

   ### Pass 5 — Tests
   - [ ] backend/tests/api/test_journal_entries.py

   ### Pass 6 — Cross-cutting
   - [ ] (expanded dynamically — see Pass 6 below)
   ```

   When a Pass 6 trigger fires (changed public API, schema, model, shared utility), append the importer/consumer/migration/doc files to the Pass 6 checklist as concrete entries and check them off like any other task.

4. Read referenced antipattern docs (from project config) once before starting passes.

5. **Read files fully, not diffs.** `git diff` is for the file list only. Existing code around changes may have issues the diff hides.

## Pass Structure

Work passes in order. Mark files `[x]` as reviewed.

**Pass precedence:** if a check could fit multiple passes, assign to the earliest applicable pass and don't re-report later. Common cases:
- Auth check inside a service method → Pass 1 (security trumps logic)
- N+1 in service called by router → Pass 3 (API surface owns query shape)
- Frontend/backend schema drift → Pass 6 (cross-layer)
- Antipattern violation in any file → Pass 2 (single owner for antipattern findings)

In every pass: flag DRY violations. If 3+ locations share near-identical logic (same structure, different arguments), report as one finding with all locations + a suggested extraction.

### Pass 1 — Security & Auth

Files: middleware, auth dependencies, auth service, token handling, admin endpoints, login/session code.

Check:

- Authentication bypass (missing auth dependency on endpoints)
- Authorization flaws (user A accessing user B's data, missing RLS)
- Injection (SQL via raw string concat, XSS via unescaped template output)
- Secret handling (hardcoded secrets, secrets in logs/responses, weak defaults)
- CSRF gaps on mutation endpoints
- Unbounded input (file uploads without size limits, unlimited query params)
- Token security (storage, expiry, rotation, scope)
- Test-only code leaking to production (unconditional route registration, debug endpoints)

### Pass 2 — Business Logic & Antipatterns

Files: services, models, schemas, enums, shared utilities.

Check:

- Data correctness (wrong calculations, off-by-one, missing validation, race conditions)
- Invariant violations (domain-specific — e.g., double-entry balance not enforced)
- Error handling (broad exception swallowing, silent failures, misleading messages)
- **Antipattern cross-reference** — for each file, apply only the antipattern rules relevant to its layer/file type (backend rules for backend files, frontend rules for frontend files). Cite the doc section in findings.

### Pass 3 — API Surface

Files: routers, request/response schemas, query parameters, pagination.

Check:

- Missing input validation (unbounded pagination, negative offsets, missing FK checks)
- Inconsistent error responses (400 vs 422 for the same class of error)
- N+1 queries (missing eager-load, lazy loads in loops)
- Pagination bugs (count query not matching data query filters, ORDER BY in count subqueries)
- Endpoint duplication that should be extracted

### Pass 4 — Frontend

Skip if no frontend exists. Files: API client, components, templates, types.

Check:

- Token/credential handling in client code
- XSS via unsafe innerHTML or template injection
- Framework-specific antipatterns (per project antipattern docs)
- API client consistency (duplicated error handling, missing CSRF headers on mutations)
- Type mismatches between frontend models and backend schemas

### Pass 5 — Tests

Files: test specs, fixtures, helpers, conftest, factories.

Check:

- Hardcoded credentials or secrets outside clearly-marked test constants
- Test-only endpoints or helpers reachable in production
- Fixtures that leak state between tests
- Tests that pass for wrong reasons (OR assertions, multi-status-code accepts)
- Missing coverage for security-critical paths (auth, admin, RLS)

### Pass 6 — Cross-cutting & Dependencies

Driven partly by findings from passes 1–5, but always trigger on these regardless of prior findings:

- **Changed public API / exported symbol / response schema / DB model** → inspect direct importers/consumers for contract drift
- **Changed migration-sensitive file** (model, schema, enum) → verify migration exists and matches
- **Changed shared utility** → grep callers; confirm assumptions still hold

Also check:

- Cross-layer consistency (backend schema adds field, frontend type doesn't)
- Stale documentation (structure/schema docs not updated after structural changes)

### Follow-up findings → task tracker

For cross-cutting findings that warrant a follow-up task (not a fix in this branch), emit `task new` commands when the project uses `managing-tasks` (i.e., `.tasks/` exists). Skip otherwise.

Template — one command per finding:

```bash
task new "<finding title>" \
  --goal "<finding summary — one sentence>" \
  --file <path>:<kind> \
  --source 'kind=review,ref=<branch-sha>#finding-<n>'
```

Rules:
- `<kind>` is `create` | `modify` | `delete` — match what the follow-up fix would do.
- `<branch-sha>` is the HEAD SHA under review; the `#finding-<n>` anchor matches the finding index in the review output.
- Emit one command per HIGH and MEDIUM finding that is **not** being fixed in this branch. Skip MINOR unless the user asks.
- Do not run the commands. List them as a block; user runs them after reviewing.

## Severity Classification

| Severity | Meaning | Examples |
|---|---|---|
| **HIGH** | Exploitable vulnerability or data loss risk. Fix before merge. | Auth bypass, SQL injection, unbounded file upload (OOM), data corruption |
| **MEDIUM** | Security weakness or correctness bug with limited blast radius. Recommend fix before merge. | Missing rate limiting, test endpoint in prod, pagination count mismatch |
| **LOW** | Minor security hardening or edge-case bug. Track as TODO. | Missing Secure flag on cookie, JWT secret fallback, inactive user sees empty page |
| **MINOR** | Code quality, performance, maintainability. Non-blocking. | Duplication, unnecessary ORDER BY in count, misleading docstring |

**When ambiguous, escalate severity if any apply:** crosses a privilege boundary, affects all users (not edge case), exploitable without prior auth, silent data corruption, no detection mechanism in place. Demote if: behind feature flag/env guard, requires admin to trigger, single-user impact, post-merge mitigation is trivial.

## Output

See `references/finding-template.md` for the per-finding format, summary table, and deduplication pattern.

## Multi-Session Handoff

When a review spans sessions, the session file's Handoff Capsule must include:

1. **Review Checklist** — with `[x]` marks
2. **Findings so far** — full text, not abbreviated
3. **Current pass** — which pass is in progress
4. **Dependency notes** — cross-cutting items flagged for Pass 6

Findings are evidence, not narrative: append each one to Milestones as it is found, so an unclean shutdown does not lose it. The capsule is the resume surface.

Next session resumes from the checklist — do not re-run `git diff` or re-read completed files **unless** Pass 6 dependency tracing requires reopening an earlier file, or the capsule is suspect.

**On resume, validate the capsule first.** If the Review Checklist is missing, the listed files don't match current `git diff`, or the session file's `branch:`/`head:` frontmatter differs from `HEAD`, stop and rebuild from Setup instead of resuming.

## Rules

- **Read fully, not diffs.** `git diff` for the file list only.
- **Check against antipatterns in Pass 2 only.** Apply only rules relevant to the file's layer/type. Cite the antipattern doc section.
- **Suggest fixes.** Concrete fix per finding. "Add validation", "add tests", "enforce auth" without specifics don't count — name the guard, the field, the function.
- **Don't fix.** Document only.
- **Deduplicate.** One pattern, one finding, all locations.
- **No style nits.** Missing docstrings, naming preferences, formatting are not findings.
- **Be specific.** File path + line number + quoted code. For structural findings spanning a function, cite `function_name (file.py:NN-MM)` with a short excerpt. "Some endpoints might have issues" is not a finding.
