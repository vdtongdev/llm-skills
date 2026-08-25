# Maintenance Config: testing-code

## Routing Table

| Content Type | Target | Section |
|---|---|---|
| Universal testing anti-pattern (framework-agnostic or Playwright-general) | `references/anti-patterns.md` | Closest thematic section |
| Layer-specific rules, code patterns, security checklist | `references/test-types.md` | Relevant layer section |
| Registry schema, target kinds, `testmap` command behavior, exit codes | `references/registry-format.md` | Relevant section |
| Value gate, planning checklist, registry workflow changes | `SKILL.md` | Relevant section |
| Trigger/scope changes | `SKILL.md` | Frontmatter description |

`scripts/testmap.mjs` is the implementation and `tests/cli.mjs` proves it. A behavior change lands in all three: the test, the script, and `references/registry-format.md`. Never document behavior the tests do not cover.

## Classification Rules

- **Anti-pattern vs. rule**: Anti-patterns have Wrong/Right code pairs showing a specific trap. Rules are general principles without code contrast.
- **Universal vs. project-specific**: If the anti-pattern applies regardless of tech stack (or is Playwright-general), it goes in the skill. If it requires a specific framework (Alpine.js, SQLAlchemy) or project architecture (BasePage, factory chain), it belongs to the project: its `.antipatterns/` registry when one exists, otherwise its testing doc.
- **Which anti-pattern section**: Data Isolation (test data ownership), Waiting and Synchronization (timing, retries), UI Interaction (locators, modals, navigation), Assertions (assertion logic), Test Execution (running tests, output).
- **Skill vs. registry record**: The skill holds reusable practice. A fact about one project's test file belongs in that file's registry record, never here.

## Format Patterns

Anti-patterns follow this structure:

```markdown
### Don't [verb] [thing]

Scope: [E2E / All / API tests / E2E (Playwright) / etc.]

**Wrong:**

⁣```[language]
// [Why this is wrong - one line]
[bad code]
⁣```

**Right:**

⁣```[language]
// [What this fixes - one line]
[good code]
⁣```

Why: [Consequence, not lecture. One or two sentences.]
```

Rules:
- Heading = trigger keyword ("Don't use `networkidle`" not "Synchronization Issue #3")
- Bad code must look real - exact code the LLM would produce
- Good code must be a drop-in replacement
- One problem per entry
- Scope tag required

## Installations

`/home/user/.agents/skills/testing-code` is canonical and holds the only executable copy: `bin/`, `scripts/`, `tests/`, `package.json`, `package-lock.json`.

`/home/user/.codex/skills/testing-code` carries Markdown only and calls the canonical executable by its absolute path. Every Markdown edit lands in both copies with the same semantic content. One difference is deliberate: the Codex Load Project Config and New Project Initialization sections name the host-native instruction file (`CLAUDE.md` or `AGENTS.md`). Everything else must match.

The frontmatter `description` must stay single-quoted in both copies. It contains `Auto-triggers on any of:` followed by a space, which an unquoted YAML scalar reads as a nested mapping and the skill validator rejects.

Verify with:

```bash
diff -rq /home/user/.agents/skills/testing-code /home/user/.codex/skills/testing-code
```

## Tests

```bash
cd /home/user/.agents/skills/testing-code && npm test > /tmp/testmap-tests.txt 2>&1
rg "not ok|fail|Error" /tmp/testmap-tests.txt
```

## File Size Thresholds

| File | Max Lines |
|---|---|
| `SKILL.md` | 200 |
| `references/anti-patterns.md` | 450 |
| `references/test-types.md` | 250 |
| `references/registry-format.md` | 250 |
