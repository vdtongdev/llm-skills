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

## Quick Checklist

Before saving any doc update:

- [ ] Right file for this content?
- [ ] Would removing this line change agent behavior?
- [ ] Can I cut 30% and keep the meaning?
- [ ] Paths/names specific (not "the file", "the test")?
- [ ] No "successfully", "we", "in order to", etc.?
- [ ] Not duplicating content from another file?
- [ ] Conditions, exceptions, and impact preserved?
