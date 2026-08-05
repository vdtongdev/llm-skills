# Adversarial Plan Review Prompt

Step 5b of planning-tasks. Runs after the completeness reviewer (5a) approves.

## Purpose

The opposite-provider reviewer attacks the PRD's ideas and assumptions. Not completeness - that is 5a's job. It catches flawed premises, missing failure modes, unvalidated assumptions, and scope creep disguised as requirements.

The user is the judge. The primary agent and adversarial reviewer are attorneys.

## Preconditions

- PRD passed step 5a (completeness reviewer approved).
- PRD is self-contained. Supply only the PRD and decision register, and instruct the reviewer not to inspect the repository.
- PRD includes Context Primer, Breadth Checklist, Key Assumptions, Known Risks sections (see `prd-template.md`).
- The opposite-provider CLI is installed and executable on PATH.

## Round 1: Invoke the opposite provider

From Claude Code, call Codex:

```bash
codex exec "<prompt>"
```

From Codex, call Claude Code and retain the returned `session_id`:

```bash
claude -p --output-format json "<prompt>"
```

The reviewer is a trusted same-user process, not a filesystem security boundary.

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

If you need information not in the PRD to strengthen a finding, ask a specific question at the end. The primary agent will answer from the codebase.

Round 2+ (when resumed with the primary agent's rebuttal):
- Open the response with a one-line status per standing finding: `Finding N: <disputed|conceded|resolved>`. Use the original numbers.
- Focus on resolving existing findings. Don't introduce net-new attacks unless a new question opened them — the author can't converge if the target keeps moving.
- If the primary agent provided codebase evidence that resolves a finding, mark it resolved and move on.
- **The text written to close a conceded finding is new, unreviewed prose. Attack it explicitly.** A fix being written down is not the fix being correct. The rebuttal will name which sections the last round caused to be rewritten; those are the round's primary target, and a defect there counts as a net-new finding rather than a moving target.

PRD:

<PRD_CONTENTS>
```

## Primary Agent's Role: Attorney, Not Postman

After the first response, the primary agent drafts a rebuttal. Stance:

- **Verify every quote before triaging it.** The reviewer is supplied only the PRD and told not to inspect the repository, while the PRD's own citations may be stale. Spot-check each quoted path, symbol, and line against the tree. Reject a finding resting on a stale citation and fix the citation in the PRD.
- **Concede cleanly** when the reviewer has a point. No performative pushback.
- **Push back with evidence** when the PRD or codebase supports it. Cite file paths, function names, existing patterns.
- **Answer the reviewer's questions** if it asked any. Read the codebase and return specific facts.
- **Flag user-judgment findings** — risks that aren't objectively right or wrong, where only the user can rule.
- **Disclose your own findings in the same pass.** Defects the primary agent noticed while working the round get reported to the user alongside the reviewer's findings, marked as self-found.

No fake politeness. No performative agreement. No bikeshedding marginal findings.

### Evidence discipline

If the primary agent cites codebase evidence to rebut a finding, that evidence must be written back into the PRD before the next round fires. The rule:

> Facts used to defend the plan belong in the plan.

Why: the primary agent has repository context that was not supplied to the reviewer. If a finding is resolved only by oral argument, the PRD still has the gap. Writing evidence back also exposes evidence that does not fit the Primer or Assumptions cleanly, which signals that the plan needs structural edits.

Workflow: before sending a rebuttal that cites new codebase facts, edit the relevant PRD section (Primer, Current State, Assumptions, or Known Risks) to incorporate those facts. Include a note pointing the reviewer at the updated section.

## Round N+1: Continue via resume

Before resuming, consolidate the PRD (`SKILL.md` § 5c) and re-run the scoped 5a. Do not send a rebuttal that references sections you have not yet rewritten.

From Claude Code, resume the same Codex session by its explicit id, never `--last`:

```bash
codex exec resume <session-id> "<claude_rebuttal>" < /dev/null
```

- Confirm the id by grepping `~/.codex/sessions` for a phrase you remember from the previous reply.
- Redirect stdin, or the call hangs waiting on it.
- Flags such as `-s` / `--skip-git-repo-check` must precede `resume`, not follow it.
- The rebuttal names which sections the previous round caused to be rewritten, so the reviewer can target them.

From Codex, resume the explicit Claude session id returned by round 1:

```bash
claude -p --resume <session-id> --output-format json "<primary_agent_rebuttal>"
```

Reject an empty or missing Claude `session_id`; do not substitute `--continue`.

## Stopping

After each reviewer response, stop and present findings to the user. The user decides:

- **Continue** - the primary agent drafts the next rebuttal and another round fires.
- **Stop** - the argument ends. The primary agent summarizes standing findings into three categories:
  - Conceded (both agree, PRD needs update)
  - Disputed (attorneys disagree, user rules)
  - Accepted risk (user keeps the plan as-is, logs to Known Risks)
- **Update PRD** - the primary agent edits the PRD per the user's ruling.

No automatic termination. No round cap.

## When the Reviewer Asks a Question

Example: *"Does the existing auth middleware already handle token rotation? If yes, finding 3 is moot."*

The primary agent reads the codebase and returns the specific answer in the next rebuttal. The external reviewer stays bound to the supplied PRD and decision register.

## Output Shape

Show the user the reviewer output from each call. If the user asks to summarize the argument, the primary agent produces the three-category summary on demand.
