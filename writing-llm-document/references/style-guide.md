# LLM Document Style Guide

## Writing Rules

### Use

- Bullet points and lists over paragraphs
- Specific references: file paths, function names, line numbers, error messages
- Bold for key labels: `**Label**: [fact]`
- Code blocks for commands and patterns
- Tables for structured comparisons
- Conditions and exceptions — these ARE the signal

### Avoid

- Narrative filler: "we", "successfully", "in order to", "after much consideration"
- Vague references: "the file", "the test", "updated the code"
- Textbook knowledge the LLM already knows
- Time estimates, completion dates — LLMs don't use these
- Status in instruction files — counts change, instructions don't
- Duplicating content across files

### Emoji

- Max one per line: ✅❌⚠️⏳
- For visual scanning only, never decorative

## Conciseness

| Verbose                                          | Concise                       |
| ------------------------------------------------ | ----------------------------- |
| "When you try to query and don't get results..." | "Query returns empty when..." |
| "The thing to remember is..."                    | [State the fact directly]     |
| "It's important to note that in UK..."           | "**UK**: [fact]"              |
| "You should always make sure to..."              | [State the rule directly]     |

### Compression Example

```text
# ❌ BAD — verbose
We successfully completed the implementation of the dashboard
test refactoring project. This involved creating a new TestAPI
helper class which provides methods for interacting with the API.

# ❌ BAD — over-compressed
✅ Tests refactored

# ✅ GOOD — enough detail to act on
✅ Dashboard tests refactored
- Created TestAPI helper (`frontend/tests/helpers/TestAPI.ts`)
- Removed XOR assertions, conditional logic
```

## Abstraction Level

```text
# ❌ BAD — too generic
Servers can have timeouts.

# ✅ GOOD — reusable pattern with conditions
**Server timeouts**: Check DNS resolution first. Known with cloud
provider DNS during maintenance windows. Intermittent + correlates
with provider status page → DNS, not app.
```

## Context Preservation

Never compress away conditions, exceptions, or impact.

```text
# BAD
FR changed resolution in 2025.

# GOOD
**FR**: From 2025-06-01, resolution changed 30min → 15min.
When querying across this date, handle resolution change explicitly.
```

## Instruction Files

| Include             | Exclude                            |
| ------------------- | ---------------------------------- |
| Patterns, workflows | Counts, stats ("86 tests passing") |
| Commands, examples  | Timestamps ("fixed last week")     |
| Anti-patterns       | Session-specific notes             |
| Pseudocode          | Verbose real code                  |

## Rules That Must Bind

A rule the reader may not skip has to be written as an obligation and placed where compliance is checked. Two failure modes, both silent:

**Description instead of obligation.** A rule phrased as a fact gets dropped under context pressure, because nothing in it says the reader owes an action.

```text
# BAD: describes where a rule applies
"TDD RED/GREEN split applies to unit, API and component tests."

# GOOD: states what the writer owes
"Every task that writes production code satisfies exactly one of: ..."
```

**Stated in the prose but absent from the checklist.** If a document has an enforced list (a gate table, a pre-submit checklist, a definition of done), a binding rule appears in BOTH the prose and that list. A rule mentioned only in prose is advisory in practice, however emphatic the wording. When the two disagree, readers follow the checklist.

Corollary: adding a fifth mention of a rule that is already stated four times does not make it bind. Move it into the enforced list and delete the escape hatches ("only where the project mandates...", "where applicable") instead.

## Anti-Patterns

```text
# BAD: Status in instruction file
"Currently 86 tests passing, 4 skipped"

# BAD: Vague references
"Updated the tests" (which tests? which files?)

# BAD: Duplicating across files
Same content in FILE_STRUCTURE.md and TESTING.md

# BAD: Irrelevant to LLM
"Step 3: Implement auth (2 hours)"
```

## Writing Anti-Pattern Entries

When writing entries for anti-pattern files (wrong/right code pairs):

1. **Heading = trigger keyword.** "Don't use `networkidle`" not "Synchronization Issue #3". The heading must match what the LLM is thinking when it's about to write the bad code.
2. **Bad code must look real.** The exact code the LLM would produce. Not pseudocode, not abstractions.
3. **Good code must be a drop-in replacement.** If the LLM has to adapt it, errors follow.
4. **One problem per entry.** One trigger, one fix.
5. **Why = consequence, not lecture.** "Matches GET instead of POST → race condition" not "This is considered bad practice."
6. **Scope tag required.** "E2E (Playwright)", "Backend (pytest)", "All tests". Prevents over-application.
7. **No duplication across files.** Each anti-pattern in exactly one file. Other files cross-reference.
8. **No backstory.** "On 2026-01-27 we spent 3 hours..." is wasted tokens. The LLM needs the pattern, not the history.

## Quick Checklist

Before saving any doc update:

- [ ] Right file for this content?
- [ ] Would removing this line change agent behavior?
- [ ] Can I cut 30% and keep the meaning?
- [ ] Paths/names specific (not "the file", "the test")?
- [ ] No "successfully", "we", "in order to", etc.?
- [ ] Not duplicating content from another file?
- [ ] Conditions, exceptions, and impact preserved?
