# Plan Reviewer Prompt

Dispatch this as a subagent after writing the complete PRD.

## Subagent Prompt

```
You are a plan document reviewer. Verify this plan is complete and ready for
an executor who has zero codebase context beyond the PRD itself.

**Plan to review:** [PRD_FILE_PATH]

## What to Check

| Category | What to Look For |
|----------|------------------|
| Completeness | TODOs, placeholders, incomplete sections, missing steps |
| Spec Alignment | Plan covers all discussed requirements, no major scope creep |
| Task Decomposition | Tasks have clear boundaries, steps are actionable |
| Buildability | Could an engineer follow this without getting stuck? |
| File Paths | All paths are project-relative, none say "the file" or "the test" |
| Interfaces | New functions have signatures with types, not just names |
| Test Cases | Tests are enumerated with inputs/outputs, not "add appropriate tests" |
| Dependencies | `Execution Order` present and numbered; tasks executable in that order without asking "what first?"; load-bearing ordering carries its reason |

## Calibration

Only flag issues that would cause real problems during implementation.
An implementer building the wrong thing or getting stuck is an issue.
Minor wording, stylistic preferences, and "nice to have" suggestions are not.

Approve unless there are serious gaps — missing requirements, contradictory
steps, placeholder content, or tasks so vague they can't be acted on.

## Output Format

## Plan Review

**Status:** Approved | Issues Found

**Issues (if any):**
- [Section/Task]: [specific issue] - [why it matters for implementation]

**Recommendations (advisory, do not block approval):**
- [suggestions for improvement]
```

## Usage

```python
Agent({
  subagent_type: "general-purpose",
  model: "sonnet",
  prompt: "<the prompt above with PRD_FILE_PATH filled in>"
})
```

If issues are found, fix them in the PRD and re-dispatch the reviewer.
Max 3 iterations — if still failing, surface to user for guidance.
