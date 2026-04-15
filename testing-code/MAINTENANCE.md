# Maintenance Config: testing-code

## Routing Table

| Content Type | Target | Section |
|---|---|---|
| Universal testing anti-pattern (framework-agnostic or Playwright-general) | `references/anti-patterns.md` | Closest thematic section |
| Layer-specific rules, code patterns, security checklist | `references/test-types.md` | Relevant layer section |
| Value gate, planning checklist, maintenance workflow changes | `SKILL.md` | Relevant section |
| Trigger/scope changes | `SKILL.md` | Frontmatter description |

## Classification Rules

- **Anti-pattern vs. rule**: Anti-patterns have Wrong/Right code pairs showing a specific trap. Rules are general principles without code contrast.
- **Universal vs. project-specific**: If the anti-pattern applies regardless of tech stack (or is Playwright-general), it goes in the skill. If it requires a specific framework (Alpine.js, SQLAlchemy) or project architecture (BasePage, factory chain), it stays in the project's `context/ANTIPATTERNS_TESTING.md`.
- **Which anti-pattern section**: Data Isolation (test data ownership), Waiting and Synchronization (timing, retries), UI Interaction (locators, modals, navigation), Assertions (assertion logic), Test Execution (running tests, output).

## Format Patterns

Anti-patterns follow this structure:

```markdown
### Don't [verb] [thing]

Scope: [E2E / All / API tests / E2E (Playwright) / etc.]

**Wrong:**

⁣```[language]
// ❌ [Why this is wrong — one line]
[bad code]
⁣```

**Right:**

⁣```[language]
// ✅ [What this fixes — one line]
[good code]
⁣```

Why: [Consequence, not lecture. One or two sentences.]
```

Rules:
- Heading = trigger keyword ("Don't use `networkidle`" not "Synchronization Issue #3")
- Bad code must look real — exact code the LLM would produce
- Good code must be a drop-in replacement
- One problem per entry
- Scope tag required

## File Size Thresholds

| File | Max Lines |
|---|---|
| `SKILL.md` | 200 |
| `references/anti-patterns.md` | 450 |
| `references/test-types.md` | 250 |
