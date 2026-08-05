# Quality Standards for Skill Knowledge

> Generic condensation and quality rules. Applied by maintaining-skills regardless of target skill.

## Condensation Pipeline

User input is conversational. Skill knowledge must be compressed, high-signal, and actionable.

### Keep (High Signal)

- Specific rules, exceptions, thresholds
- Domain-specific variations (market, provider, technology)
- Non-obvious behaviors and gotchas
- Solutions with code examples
- Concrete error messages and their causes
- Conditions and edge cases

### Remove (Low Signal)

- Conversational filler ("you know", "basically", "I think")
- Textbook knowledge (the LLM already knows general programming, math, etc.)
- Obvious information that any competent developer would know
- Temporary workarounds (fix the root cause instead)
- Narrative fluff ("after much consideration", "successfully", "in order to")

### Conciseness Table

| Verbose | Concise |
|---|---|
| "When you try to query and don't get results..." | "Query returns empty when..." |
| "The thing to remember is..." | [Just state the fact] |
| "It's important to note that in UK..." | "**UK**: [fact]" |
| "You should always make sure to..." | [State the rule directly] |

### Examples

**Too verbose:**

```markdown
When asked for NMAE, you should calculate it as the mean absolute error divided
by the mean of the actual values over the period. This is important because it
normalizes the error relative to the size of the values being predicted. Make
sure it's clear if the forecast is DA or ID.
```

**Too condensed:**

```markdown
**NMAE**: Forecast vs actual
```

**Right:**

```markdown
**NMAE Calculation Steps**
1. Check if input is clear: DA vs ID
2. Check if resolution and unit are consistent
3. Use standard NMAE formula (well-known formulas don't need to be spelled out — the LLM knows them)
4. Return percentage, 2 decimal places
```

## When NOT to Add

Before writing, check these disqualifiers:

- **Duplicate**: similar content already exists in target file → update/augment instead
- **General knowledge**: the LLM already knows this (standard algorithms, common patterns)
- **Too specific**: one-time incident, not a reusable pattern. Ask user if it generalizes.
- **Too obvious**: wouldn't change agent behavior if removed
- **Contradicts existing**: surface the conflict, let user resolve
- **Exploration, not fact**: user is thinking aloud, not stating a rule. Wait for confirmation.

## Abstraction Level

Content should be general enough to be reusable, specific enough to be actionable.

**Too specific** (one-time incident):

```markdown
On 2025-01-15, mt_uk2_seagreen_2 had flat metering due to comms issue.
```

**Right** (reusable pattern):

```markdown
**Flat metering**: Check comms status first. Known for offshore UK parks
(intermittent satellite links). If flat at 0 overnight → likely comms, not curtailment.
```

**Too generic** (doesn't help):

```markdown
Flat metering is a problem.
```

If user provides a specific incident, ask: _"Is this a one-off, or does this generalize to a pattern?"_

## Missing Context Check

Over-compression loses essential information. Always preserve:

- **Conditions**: when does this apply? (market, time of day, season, technology)
- **Exceptions**: when does this NOT apply?
- **Impact**: what goes wrong if ignored?

**Bad** (missing context):

```markdown
FR changed resolution in 2025.
```

**Good** (conditions + impact preserved):

```markdown
**FR**: From 2025-06-01, data resolution changed from 30min to 15min.
When querying across this date, handle resolution change explicitly.
Default: interpolation fill.
```

## Common Mistakes

### Wrong file placement

Content routed to the wrong file based on surface keywords rather than actual content type. Always use the target skill's classification rules, not keyword matching.

### Not reading target file first

Adding duplicate content because the file wasn't checked. Always read the full target file before proposing additions.

### Wrong abstraction level

Either too specific (single incident) or too generic (states the obvious). The sweet spot: a reusable pattern with conditions and exceptions.

### Aggressive compression loses signal

Removing conditions and exceptions to save lines. The conditions ARE the signal.

```markdown
Bad:  "Flat metering is problem"
Good: "Flat metering is problem, EXCEPT: flat at 0 overnight (solar) or flat at capacity (at limit)"
```

### Format violations

Not following the target file's established patterns. Always match the existing format — headings, code blocks, list style, bold patterns.

## Update Checklist

Before confirming an update to the user:

- [ ] Correct target file (per MAINTENANCE.md routing)
- [ ] Read target file first (checked for duplicates)
- [ ] Kept essential context (conditions, exceptions, impact)
- [ ] Followed target file's format pattern
- [ ] Removed filler, kept signal
- [ ] File stays under line threshold
- [ ] Content is at the right abstraction level (reusable, not one-off)
