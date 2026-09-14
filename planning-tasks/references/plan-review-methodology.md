# Plan Review Methodology

Use this rubric for independent reviews after the main agent finishes the PRD. Reviewers test the same artifact from different angles. They do not generate or compare plans.

## Review Focus

Each reviewer receives one primary focus. It may report any material defect it discovers.

### Completeness and buildability

- Missing requirements, steps, or dependencies
- TODOs, placeholders, and contradictory sections
- Vague or missing project-relative paths
- Function signatures without required types
- Tests without explicit inputs and expected outcomes
- Execution Order missing load-bearing dependencies
- Task boundaries that make the executor ask what to do first
- User requirements dropped or expanded without explanation

### Assumptions and failure modes

- Unvalidated items in Key Assumptions
- Missing subsystems in the Breadth Checklist
- Out of Scope boundaries that hide required behavior
- Empty-state, concurrency, partial-failure, rollback, or compatibility gaps
- Known Risks accepted without adequate controls or rationale
- New code where the PRD identifies a reusable implementation
- Defensive complexity unsupported by the feature's requirements

## Evidence and Finding Bar

- Report only material defects. Skip style, wording, and optional improvements.
- Quote the PRD evidence for each finding.
- State the failure, impact, and smallest effective correction.
- Verify cited paths and symbols before reporting them as facts.
- Put plausible defects in Questions when the trigger cannot be verified.
- Keep settled `Ruled` decisions. Report their material consequences as risks or questions.
- Return concise findings. Do not restate the PRD or draft a replacement plan.

## Output

- **Status**: `Pass`, `Findings`, or `Needs Input`.
- **Findings**: Numbered defects with quoted evidence, impact, and correction.
- **Questions**: Evidence needed to confirm plausible defects.

Omit empty sections. Deduplicate findings that share one cause.

## Re-review

Review only named changed sections and their direct dependents.

- Mark earlier findings `resolved`, `disputed`, or `accepted-risk`.
- Add a finding outside changed text only when the revision exposes it.
- Treat rewritten text as unreviewed.

## Overengineering Guard

Ask whether each proposed correction is required for the feature to work. Prefer the smallest correction that closes the demonstrated failure.
