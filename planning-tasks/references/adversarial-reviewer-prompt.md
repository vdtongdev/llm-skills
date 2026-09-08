# Review Methodology

Reference for agents performing reviews. This document defines what to look for and how to calibrate findings. The agent definition owns the behavioral rules (Ruled convention, concede mechanic, output structure).

## Attack Surface

Organized by review phase. Not every item applies to every review.

### Peer review (§3c)

- Decisions left unsettled that the executor would have to invent
- Assumptions stated without justification
- Missing failure modes (empty state, concurrent access, partial failure, rollback)
- Reuse violations: new code proposed where the exploration doc lists a working implementation
- Complexity that does not earn its cost on any axis

### PRD review - completeness (§5a)

- Incomplete sections, missing steps
- File paths that say "the file" or "the test" instead of a project-relative path
- Function signatures missing types
- Test cases described as "add appropriate tests" instead of enumerated
- Execution Order absent, unnumbered, or missing load-bearing ordering reasons
- Spec alignment: requirements discussed in §1 that the PRD dropped without explanation
- Task boundaries unclear or steps not actionable without asking "what first?"
- Buildability: could an engineer follow this without getting stuck?

### PRD review - adversarial (§5b)

- Unvalidated assumptions in Key Assumptions
- Gaps in the Breadth Checklist: subsystems the author forgot
- Out of Scope boundaries that look like scope bugs, not discipline
- Failure modes the plan does not address
- Risks dismissed in Known Risks without adequate justification
- Section-quality audit: a suspiciously short or evasive section is a finding in itself. A thin Key Assumptions list or a Known Risks section missing obvious risks is evidence of unreviewed blind spots, not evidence there are none

## Finding Bar

- Report only material findings. Skip style, wording, nice-to-haves.
- Each finding: what can go wrong, why this design is vulnerable, likely impact, concrete change that would reduce risk.
- Prioritize strong findings over many. Three strong findings beat ten weak ones.
- A finding must be defensible from the available evidence (exploration doc, proposal text, PRD text, or code the reviewer read directly). If a finding depends on state the reviewer cannot verify, flag it as an assumption: "Assumes X based on claim Y; if wrong, finding is moot."

## Evidence Discipline

Facts used to defend the plan belong in the plan.

When the main agent rebuts a finding by citing codebase evidence not already in the PRD, that evidence must be written into the PRD (Context Primer, Current State, Key Assumptions, or Known Risks) before the next round fires. A finding resolved only by oral argument leaves the gap in the PRD for the next reader to rediscover.

Evidence that does not fit any existing section cleanly signals that the plan needs structural edits, not a footnote.

## Round Protocol

**Peer review:** Use `Agree`, `Disagree`, and `Questions`. Resolve Questions before testing convergence. Re-emit a proposal only when it changes.

**Adversarial round 1:** Report numbered findings and Questions.

**Adversarial round 2+:**

- Mark every earlier finding `resolved`, `disputed`, or `accepted-risk`.
- Focus on standing findings. Add a new finding only when a previous answer or rewritten section exposes it.
- Treat rewritten prose as unreviewed. A defect in that prose is a new finding.

## Overengineering Guard

Applies at every review phase. Multiple agents reviewing each other tend to build toward more complex solutions over successive rounds. Each round should ask: "Is this addition necessary for the feature to work, or is it defensive complexity?"

Fewer moving parts means fewer points to break. A correct simple design beats a sophisticated design that handles edge cases the feature will never hit.
