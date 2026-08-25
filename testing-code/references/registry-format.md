# Test Registry Format

The registry describes a project's test suite: one record per executable test file, plus records for known gaps. Test source stays authoritative for test names and assertions. The registry answers "which files cover this code, what do they cover, and what is missing".

The `testmap` CLI is read-only. It never writes, repairs, or synchronizes records. You edit the YAML by hand.

## Layout

```
.test-registry/
├── config.yaml
├── tests/<source path>.yaml     one record per executable test file
└── gaps/TG-NNN.yaml             one record per confirmed gap
```

A record's location is its identity. `.yaml` is **appended** to the source path, not substituted:

| Source file | Record |
|---|---|
| `backend/tests/unit/services/test_clock.py` | `.test-registry/tests/backend/tests/unit/services/test_clock.py.yaml` |
| `frontend/e2e/crud/accounts-crud.spec.ts` | `.test-registry/tests/frontend/e2e/crud/accounts-crud.spec.ts.yaml` |

There is no `test_file` field. The CLI derives the source path by stripping the trailing `.yaml`, so record and source cannot disagree. Appending keeps the reverse mapping unambiguous: replacing the extension would collapse `test_a.py` and `test_a.ts` onto the same name.

## config.yaml

```yaml
suites:
  - name: backend
    root: backend/tests
    pattern: "**/test_*.py"
  - name: frontend-e2e
    root: frontend/e2e
    pattern: "**/*.spec.ts"
```

- `name`, `root`, and `pattern` are required non-empty strings. Names are unique.
- `root` is a project-relative directory.
- Suites exist only to find executable test files, so `validate` can report unregistered ones. They carry no parser or adapter.

## Test-file record

```yaml
layer: api
summary: Covers enrollment writes, reads, derived status, and role restrictions.
topics: [authorization, enrollment, date-handling]
targets:
  - kind: path
    ref: backend/services/enrollment_service.py
  - kind: endpoint
    ref: POST /enrollments
notes:
  - Withdrawal-date clamping is witnessed by the past-date case, not the happy path.
anti_patterns: [AP-014]
```

| Field | Required | Rule |
|---|---|---|
| `layer` | yes | one of `api`, `unit`, `integration`, `script`, `e2e` |
| `summary` | yes | non-empty string; what the file actually covers |
| `topics` | yes | non-empty list of unique kebab-case strings |
| `targets` | yes | non-empty list of `{kind, ref}` mappings |
| `notes` | no | file-wide caveats a reader cannot reconstruct from source |
| `anti_patterns` | no | existing `AP-NNN` ids |

Omitted optional lists read as `[]`.

Keep records short. Source owns fixtures and ordinary case names. Notes are for the non-obvious: which case witnesses an invariant, why a weaker assertion is deliberate, mutation evidence.

## Target kinds

| Kind | Path-bearing | Meaning |
|---|---|---|
| `path` | yes | project-relative file path; may contain minimatch globs |
| `symbol` | yes | `<project-path>#<symbol>` |
| `endpoint` | no | HTTP method plus route, e.g. `POST /enrollments` |
| `route` | no | a UI route |
| `invariant` | no | a named domain rule |

Path-bearing targets do two things: `select --path` matches them, and `validate` checks they exist on disk. A glob is satisfied when it matches at least one path. The label kinds are selectable only by their literal text and are never existence-checked.

There is no `script` target kind. A ref under `scripts/` is an ordinary `path`, so deleting the script raises `missing-target`. Note that `script` **is** a valid `layer`; the two are unrelated.

## Gap record

A gap is confirmed missing coverage, not a wish list.

```yaml
id: TG-001
title: Grade ordering depends on migration-seeded rows
status: open
layer: api
summary: Replace the seeded-row non-vacuity guard with test-owned evidence.
topics: [grades, fixtures, test-quality]
targets:
  - kind: path
    ref: backend/services/grade_service.py
sources:
  - kind: review
    ref: session:0170
notes: []
```

- `id` matches `TG-[0-9]{3}`, is unique, and equals the filename stem.
- `status` is `open` or `accepted-risk`.
- `layer` uses the same five-value enum as test-file records. `select --layer` filters records and gaps together, so an off-enum layer makes the gap unreachable.
- `id`, `title`, `status`, `layer`, `summary`, `topics`, `targets`, and `sources` are all required. `notes` is optional.
- Each source is a `{kind, ref}` mapping; kinds are free strings (`review`, `session`, `task`, ...).
- Gap records carry no task progress. A task may cite a gap id as its source.
- Delete the gap record when executable coverage replaces it. Git keeps the history.

## Commands

Run from the project root:

```bash
~/.agents/skills/testing-code/bin/testmap <command>
```

### `select [--path PATH] [--topic TOPIC] [--layer LAYER]`

Finds relevant test files and gaps. Options are repeatable. With no selector it returns everything.

- Selection is a **union**, not an intersection. Every matching reason is returned.
- Every selector applies to gaps on the same terms as to records. Gaps own no source file, so `test-file:` never applies to them.
- `--path` matches a record when the value equals its derived source path, matches a `path` target glob, or matches the path portion of a `symbol` target.
- Reasons are `test-file:<path>`, `target:<ref>`, `topic:<topic>`, `layer:<layer>`, in that order, sorted lexically inside each category.
- Results sort by source path; gaps sort by id. There is no ranking, no limit, no truncation.

```bash
testmap select --path backend/services/enrollment_service.py --topic authorization
```

```yaml
query: {paths: [backend/services/enrollment_service.py], topics: [authorization], layers: []}
test_files:
  - test_file: backend/tests/api/academics/test_enrollment_api.py
    layer: api
    summary: Enrollment API behavior.
    topics: [authorization, enrollment, date-handling]
    reasons: [target:backend/services/enrollment_service.py, topic:authorization]
gaps: []
total: {test_files: 1, gaps: 0}
incomplete: false
```

Compact gaps carry `status`, so an `open` gap is distinguishable from one already ruled `accepted-risk` without a second call.

**Check `incomplete`.** It is true when any record was skipped as unreadable or invalid. The failure is inverted and silent: a damaged record makes its test *disappear* from selection, so an agent that ignores the flag concludes no coverage exists and writes a duplicate test. Run `validate` when it is true.

### `show <ref>`

Returns one complete stored record. `<ref>` is either a test source path or a `TG-NNN` gap id. A source path returns the record plus its derived `test_file`. Use this for a gap's `targets`, `sources`, and `notes`, which compact `select` output omits.

### `validate`

Read-only. Reports every problem in one pass and never repairs anything.

Checks: config present and valid; every record and gap parses and satisfies its schema; gap ids unique and matching their filenames; every discovered test file has a record; every record's source path exists; every `path` target and `symbol` path portion exists.

Problem kinds: `missing-config`, `invalid-config`, `invalid-record`, `duplicate-gap-id`, `unregistered-test-file`, `missing-test-file`, `missing-target`.

```yaml
ok: false
checked: {test_records: 54, gap_records: 3, discovered_test_files: 54}
problems:
  - kind: unregistered-test-file
    file: backend/tests/unit/test_missing.py
    detail: Source test file has no registry record.
```

**Validation proves structure, not truth.** It confirms that a record's file and targets exist. It cannot read prose, so a summary that describes coverage the file no longer has passes clean. The only control for that is re-reading the test source after changing it.

## Output contract

- Every stdout response is YAML. Diagnostics and skipped-record warnings go to stderr.
- Paths in output are normalized and project-relative.
- Output is deterministic: no timestamps, no colors.
- Empty collections stay present as `[]`.

| Exit | Meaning |
|---|---|
| 0 | success |
| 1 | internal error, including `show` on a damaged record |
| 2 | not found, including a missing `.test-registry/config.yaml` |
| 3 | invalid arguments, including a `--path` outside the project |
| 4 | `validate` found problems |

A damaged record degrades differently per command by design: `select` skips it and sets `incomplete`, because a partial answer beats none during navigation; `show` exits 1, because there is nothing partial to return; `validate` reports it.

## Setting up a new project

1. Write `.test-registry/config.yaml` with one suite per test root.
2. Run `testmap validate`. Every test file reports as `unregistered-test-file`; that list is the work queue.
3. Write a record per file. **Open each test file first.** A record written from another document, or from a filename, is a guess.
4. Run `testmap validate` until it exits 0.
5. Add the registry route to the project's instruction file under the `testing-code` configuration.
