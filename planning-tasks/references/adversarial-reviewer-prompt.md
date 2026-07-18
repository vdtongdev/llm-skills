# Adversarial Plan Review Prompt

Step 5b of `/planning-tasks`. Runs after the completeness reviewer (5a) approves.

## Purpose

Codex attacks the PRD's ideas and assumptions. Not completeness — that's 5a's job. Catches: flawed premises, missing failure modes, unvalidated assumptions, scope creep disguised as requirements.

User is the judge. Claude and Codex are attorneys.

## Preconditions

- PRD passed step 5a (completeness reviewer approved).
- PRD is self-contained — Codex only reads the PRD, no repo access.
- PRD includes Context Primer, Breadth Checklist, Key Assumptions, Known Risks sections (see `prd-template.md`).
- `codex` CLI is installed and executable on PATH.

## Round 1: Invoke Codex

Call the Codex CLI directly:

```bash
codex exec "<prompt>"
```

Use `Bash(..., run_in_background: true)`. Harness notifies on completion.

Prompt template — substitute `<PRD_CONTENTS>` with the full PRD text:

```
You are reviewing a PRD adversarially. Your job is to find the strongest reasons this plan should not ship as-is, not to validate it.

Default to skepticism. Assume the plan can fail in subtle, high-cost, or user-visible ways until the PRD proves otherwise. Do not give credit for good intent or likely follow-up work.

Attack surface:
- Unvalidated assumptions in the "Key Assumptions" section
- Gaps in the "Breadth Checklist" — subsystems the author forgot to consider
- "Out of Scope" boundaries that look like scope bugs, not discipline
- Failure modes the plan doesn't address (empty state, concurrent access, partial failure, rollback, version skew)
- Risks dismissed in "Known Risks" without adequate justification
- **Section-quality audit**: treat a suspiciously short or evasive section as a finding in itself. A lazy Context Primer, a thin Key Assumptions list, or a Known Risks section missing obvious risks is evidence of unreviewed blind spots, not evidence there are none.

Finding bar:
- Report only material findings. Skip style, wording, nice-to-haves.
- Each finding: what can go wrong, why this plan is vulnerable, likely impact, concrete change that would reduce risk.
- Prioritize strong findings over many weak ones.

Grounding:
- Every finding must be defensible from the PRD text alone.
- If a finding depends on codebase state you cannot verify, flag it as an assumption: "Assumes X based on PRD claim Y; if wrong, finding is moot."
- Do not fabricate file paths, function names, or system behavior not in the PRD.

Bundle all findings in one response. Number them for reference.

If you need information not in the PRD to strengthen a finding, ask a specific question at the end. The reviewing engineer (Claude) will answer from the codebase.

Round 2+ (when resumed with Claude's rebuttal):
- Open the response with a one-line status per standing finding: `Finding N: <disputed|conceded|resolved>`. Use the original numbers.
- Focus on resolving existing findings. Don't introduce net-new attacks unless a new question opened them — the author can't converge if the target keeps moving.
- If Claude provided codebase evidence that resolves a finding, mark it resolved and move on.

PRD:

<PRD_CONTENTS>
```

## Claude's Role: Attorney, Not Postman

After Codex's first response, Claude drafts a rebuttal. Stance:

- **Concede cleanly** when Codex has a point. No performative pushback.
- **Push back with evidence** when the PRD or codebase supports it. Cite file paths, function names, existing patterns.
- **Answer Codex's questions** if it asked any. Read the codebase, return specific facts.
- **Flag user-judgment findings** — risks that aren't objectively right or wrong, where only the user can rule.

No fake politeness. No performative agreement. No bikeshedding marginal findings.

### Evidence discipline

If Claude cites codebase evidence to rebut a finding, that evidence must be written back into the PRD before the next round fires. The rule:

> Facts used to defend the plan belong in the plan.

Why: Claude has repo access, Codex doesn't. If a finding is only resolved by Claude's oral argument, the PRD still has the gap — the next reader (a different Codex run, a future executor, the user months later) has no way to reconstruct why the concern was dropped. Writing evidence back also catches cases where Claude's "evidence" doesn't actually fit the Primer or Assumptions sections cleanly — that's a signal the plan needs structural edits, not just a rebuttal.

Workflow: before sending a rebuttal that cites new codebase facts, edit the relevant PRD section (Primer, Current State, Assumptions, or Known Risks) to incorporate those facts. Send the rebuttal, and include a note pointing Codex at the updated section.

## Round N+1: Continue via resume

Each subsequent round resumes the same Codex session:

```bash
codex exec resume --last "<claude_rebuttal>"
```

## Stopping

After each Codex response, stop and present findings to user. User decides:

- **Continue** — Claude drafts next rebuttal, another round fires.
- **Stop** — Argument ends. Claude summarizes standing findings into three categories:
  - Conceded (both agree, PRD needs update)
  - Disputed (attorneys disagree, user rules)
  - Accepted risk (user keeps the plan as-is, logs to Known Risks)
- **Update PRD** — Claude edits PRD per user's ruling.

No automatic termination. No round cap.

## When Codex Asks a Question

Example: *"Does the existing auth middleware already handle token rotation? If yes, finding 3 is moot."*

Claude reads the codebase, returns the specific answer in the next rebuttal. This is the only path where Claude reads files during adversarial review — Codex stays PRD-bound.

## Output Shape

User sees raw bash output from each Codex call. No structured transcription. If user asks "summarize the argument," Claude produces the three-category summary on demand.
