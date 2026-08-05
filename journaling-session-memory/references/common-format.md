# COMMON.md Format

COMMON is the dense active project view loaded at every onboard. Keep current cross-cutting directives and retrieval routes only. Session files retain history and rationale.

## Template

```markdown
---
budget_words: { target: 2000, hard: 3500 }
---

# Common Knowledge

## Constraints

## Decisions

## Questions

## Redirects

## Topics
```

Projects may raise `budget_words` manually. Count the complete file with `wc -w`.

## Dense Syntax

- Use fragments, not explanatory prose. Drop articles and copulas when meaning survives.
- Preserve negation, quantities, scope, conditions, exceptions, identifiers, paths, and commands.
- Omit rationale, history, rejected alternatives, attribution, and status labels implied by the section.
- End each C/D/Q entry with source session ids: `(0004)` or `(0004, 0006)`.
- Conditional directive adds `RECHECK: <events>`; permanent directive does not.

```markdown
- C-01: timestamp timezone-aware; storage UTC. (0001)
- D-03: Rotate refresh token; access token short-lived. RECHECK: auth redesign. (0004)
- Q-02: Refresh-token revocation strategy? blocks T-14. (0004)
```

If compression removes a condition that changes behavior, restore it. Anyone needing the argument reads the cited session.

## Anchors

- `C-NN`: current cross-cutting constraint or convention.
- `D-NN`: current finalized decision.
- `Q-NN`: current unresolved project-level question.
- Allocate `max + 1` by scanning C/D/Q anchors across `<state-dir>`. Never reuse a deleted anchor.
- Materially changed ruling gets a new D anchor. Do not silently change an existing anchor's meaning.

## Section Rules

### Constraints

Authoritative facts only. Move reusable failure patterns only to an antipattern document loaded for every supported host.

### Decisions

Directive and operational boundaries only. No justification or `user ruling` label. Temporary workarounds and version-sensitive choices name concrete `RECHECK` events.

### Questions

Unresolved project questions only. Session Handoff references `Q-NN`; it does not copy the question. Delete on resolution; create a D entry only when the answer leaves a continuing directive.

### Redirects

Compatibility pointers only:

```markdown
- D-38 -> D-41
- C-71 -> `context/ANTIPATTERNS_WORKFLOW.md`
```

Keep a redirect only while a live document references the retired anchor. History belongs in session files. Delete redirects after inbound references are updated.

### Topics

Active cross-session retrieval routes only:

```markdown
- auth (T-12): 0069, 0070; refresh revocation
```

- Topic names are subsystems, not features.
- Keep only sessions useful to current work.
- Delete closed/done topics unless an active C/D/Q or task still needs the route.
- Recreate a pruned topic through targeted archive search if work returns.

## Entry Lifecycle

When work triggers `RECHECK` or touches an entry's subject, classify it at checkpoint:

- `KEEP`: directive still binds; no write.
- `REPLACE`: allocate replacement anchor; record session event; remove old entry unless a redirect is required.
- `RETIRE`: record invalidation evidence in session Log; delete entry.
- `PROMOTE`: update a permanent document loaded for every supported host; record session event; delete entry. Verify loading through shared project instructions or task `kind`/`context[]`; if ambiguous, KEEP.

Do not say content was "demoted to a session." Its source evidence already lives there; the current session records retirement.
