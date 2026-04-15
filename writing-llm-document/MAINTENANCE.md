# Maintenance Config: writing-llm-document

## Routing Table

| Content Type | Target | Section |
|---|---|---|
| Writing rules (use/avoid) | `references/style-guide.md` | Writing Rules |
| Verbose → concise pairs | `references/style-guide.md` | Conciseness |
| Bad documentation examples | `references/style-guide.md` | Anti-Patterns |
| Anti-pattern entry writing rules | `references/style-guide.md` | Writing Anti-Pattern Entries |
| Trigger/scope changes | `SKILL.md` | When This Applies |
| Process changes | `SKILL.md` | Process |
| Checklist changes | `references/style-guide.md` | Quick Checklist |

## Classification Rules

- "Don't do this" example → Anti-Patterns
- Verbose → concise pair → Conciseness table
- New use/avoid rule → Writing Rules
- New pre-save check → Quick Checklist
- When skill should/shouldn't trigger → SKILL.md § When This Applies

## Format Patterns

Match existing format in each section:
- **Writing Rules**: bullet point per rule under `### Use` or `### Avoid`
- **Conciseness**: `| verbose | concise |` table row
- **Anti-Patterns**: `# BAD: [label]` + quoted example

## File Size Thresholds

| File | Max Lines |
|---|---|
| `SKILL.md` | 50 |
| `references/style-guide.md` | 150 |
