# Plan Template

Keep the plan short enough to scan and specific enough to execute. Include only the chosen approach. Omit empty sections.

```markdown
# Plan: <Feature Name>

## Context

<Problem or need, what prompted it, intended outcome.>

## Approach

<Chosen design in a few bullets. Pseudocode only where the logic is not obvious.>

## Steps

- [ ] <Step>: <change>; files `<path>`; check: <how to verify>

## Critical Files and Reuse

- `<path>`: <what changes>
- Reuse `<function>` from `<path>`

For a change repeated across many files, describe the pattern once and list a few representative paths.

## Risks and Accepted Tradeoffs

- <Risk>: <mitigation or acceptance reason>

## Out of Scope

- <Excluded item>

## Verification

<End-to-end check: commands, tests, or manual steps.>
```

Keep a one-line rationale for any constraint a competent implementer might delete as an obvious simplification. Name the invariant and the concrete failure.
