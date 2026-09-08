# Planner Prompt Templates

Templates for the main agent when invoking `planner` agents. Substitute `<PLACEHOLDERS>` before dispatch. Each template is one prompt - send it as the `prompt` parameter of the Agent tool (for initial spawn) or as a SendMessage `message` (for re-invocation).

## Initial Proposal (§3a)

Spawn one per provider. Use `subagent_type: "planner"` with a `model` override and a unique `name` (e.g., `planner-simplicity`).

```
Design a solution for the following feature.

Mode: Proposal

Design axis: <AXIS>
Emphasize <AXIS> in your tradeoffs. Other concerns still matter.

Exploration doc: <EXPLORATION_DOC_PATH>
PRD template: <PRD_TEMPLATE_PATH>
Review methodology: <REVIEW_METHODOLOGY_PATH>

Requirements:
<REQUIREMENTS_SUMMARY - the main agent's summary of §1, not the raw user request>

Decisions that must be settled (address each one explicitly in your Requirements section):
- <DECISION_1>
- <DECISION_2>
- ...

Read the exploration doc first. Read the PRD template for required design topics, then use the Proposal output contract from your agent definition.
```

## Re-invocation with Answers (§3b)

Send via SendMessage to the named planner agent.

```
Answers to your questions:

Continue mode: Proposal

- Q: <QUESTION_1>
  A: <ANSWER_1>
- Q: <QUESTION_2>
  A: <ANSWER_2>

Update your proposal with these answers. Re-emit the full updated proposal.
```

If the main agent cannot answer a question satisfactorily, do not include it here. Elevate it to the user first, then re-invoke with the user's answer.

## Peer Review (§3c, round 1)

Send via SendMessage. Include the other planner's full proposal text.

```
Review this proposal from <PLANNER_NAME> (axis: <THEIR_AXIS>):

Mode: Peer Review

---
<FULL_PROPOSAL_TEXT>
---

<If any user rulings exist from a previous round:>
Ruled:
- Ruled: <DECISION>, because <REASON>
- ...

Follow the peer review protocol in your agent definition and the review methodology reference.
```

## Self-Defense (§3c, round 2+)

Send via SendMessage. Include the critique the planner received.

```
<REVIEWER_NAME> (axis: <THEIR_AXIS>) reviewed your proposal:

Continue mode: Peer Review

---
<FULL_REVIEW_TEXT>
---

Respond with Agree/Disagree/Questions on each point. Re-emit your full updated proposal if you concede any point.
```

## PRD Review - Completeness (§5a)

Send via SendMessage to each planner agent.

```
Review this PRD for completeness. Check for the items listed under "PRD review - completeness (§5a)" in the review methodology reference.

Mode: Plan Completeness Review

PRD: <PRD_PATH>
Review methodology: <REVIEW_METHODOLOGY_PATH>

Ruled:
- Ruled: <DECISION>, because <REASON>
- ...

Read the PRD, then spot-check file paths and function signatures against the tree.
```

## PRD Review - Adversarial (§5b)

Send via SendMessage to each planner agent.

```
Review this PRD adversarially. Find the strongest reasons this plan should not ship as-is. Check for the items listed under "PRD review - adversarial (§5b)" in the review methodology reference.

Mode: Plan Adversarial Review

PRD: <PRD_PATH>
Decision record: <DECISION_RECORD_PATH>
Review methodology: <REVIEW_METHODOLOGY_PATH>

Ruled:
- Ruled: <DECISION>, because <REASON>
- ...

Read the PRD and review methodology. Read the decision record unless its value is `none`. Spot-check cited paths and signatures against the tree.
```

### §5b Round 2+

```
Previous round findings - update status for each:
<FINDING_STATUS_LIST - e.g. "Finding 1: resolved", "Finding 2: disputed", "Finding 3: accepted-risk">

Continue mode: Plan Adversarial Review

Sections rewritten since last round:
- <SECTION_NAME>: <BRIEF_DESCRIPTION_OF_CHANGE>

Review the rewritten sections as primary targets. New prose is unreviewed - a defect there is a new finding.

Do not introduce new attacks unless a previous answer opened them.
```

## Notes for the Main Agent

- Always use SendMessage to continue an existing planner. Fresh Agent spawns lose the planner's accumulated context.
- When passing proposals between planners, paste the full text. Planners cannot read files they did not create.
- The review methodology reference path is: `~/.claude/skills/planning-tasks/references/adversarial-reviewer-prompt.md`.
- Track planner agent names and their assigned axes. You will need them for routing reviews and writing the disagreement report.
