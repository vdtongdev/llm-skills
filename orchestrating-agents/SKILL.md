---
name: orchestrating-agents
description: Coordinate planning and implementation through a main orchestrator and specialized subagents. Use for delegation, parallel agents, planner groups, task workers, or reviewed task-graph execution. Keep genuinely small tasks with the orchestrator.
---

# Orchestrating Agents

Remain the user's single coordinator. Own scheduling, context, journal state, Git integration, review adjudication, and the final claim. Delegation never transfers accountability.

## Route Context by Agent Type

Agent definitions own stable expertise, tool limits, modes, and output contracts. The invoking skill owns workflow order and task-specific gates. This skill owns context selection, dispatch, ownership, and lifecycle. Do not copy an agent's stable behavior into its dispatch prompt.

Every dispatch names the objective, mode, source paths, settled user decisions, owned paths or read-only boundary, required checks, expected deliverable, and escalation triggers. Add the matching context:

- **Discoverer**: search focus and breadth; project structure docs; relevant registries; evidence required from code and tests.
- **Planner / proposal**: user requirements; exploration artifact; design axis; decisions to settle; plan template and design rules.
- **Planner / plan review**: plan artifact; review mode and rubric; decision record; settled rulings; code paths allowed only for citation checks.
- **Task writer**: approved plan; testing policy by layer; project instructions; task schema and quality contracts; owned `.tasks/` paths; verification command.
- **Worker**: task or assignment; definition of done; project rules; implementation evidence; owned and forbidden paths; required checks.
- **Reviewer**: stable artifact; artifact type; accepted objective and rubric; project rules; relevant registries; code-review base and head when applicable. Do not include worker conclusions or a preferred verdict.

Planning dispatches remain under `planning-tasks`. They do not enter the implementation task suite, use worker journal proposals, stage changes, or trigger the serial code-review gate. The main agent still owns user questions, rulings, synthesis, plan files, task acceptance, and journal state.

## Choose the Execution Shape

Handle work directly only when all are true:

- one narrow deliverable
- no unresolved architecture, user preference, or cross-system contract
- low-risk, reversible changes with limited shared-state effects
- dispatch and reintegration would cost more than implementation

For implementation, use three distinct roles:

1. **Worker**: implement or investigate one assigned task; verify the result.
2. **Reviewer**: criticize the stable batch independently and adversarially; invoke `reviewing-code` for code review; never implement fixes.
3. **Orchestrator**: schedule workers, verify evidence, integrate and commit changes, maintain journal state, adjudicate findings, and report to the user.

Project instructions may require independent review even for direct work. If a required role is unavailable, disclose it and pause. Resume only when the role becomes available or the user explicitly changes the execution shape. Never describe a fallback as three-party work or independent review.

## Classify Untracked Work

When requested work does not map to an existing task or accepted task graph, classify it before execution:

1. **Small**: If it satisfies every direct-work condition above, handle it immediately with the orchestrator. Do not create a task solely to execute it.
2. **Heavy**: If it needs broad research, six or more implementation steps, multi-file architectural decisions, or unresolved design, cite the observed complexity and ask whether to invoke `planning-tasks`. Do not disguise planning work as a worker assignment.
3. **Medium**: Otherwise analyze the objective, task type, write surface, dependencies, risks, and required checks, then dispatch one untracked worker.

Before dispatching medium work:

1. Inspect the available skill list, project documents and instructions, relevant source files, logs, and other task evidence.
2. Select context by task type and observed scope. For example, coding may need the applicable coding antipattern document; code review may need the applicable antipattern document plus `reviewing-code`. Treat examples as routing hints, not a fixed table.
3. Prime the worker with the selected content and its source. For long sources, name the exact path and relevant sections to read instead of copying unrelated content.

Do not create a tracker task for medium work solely because it is delegated. Apply the normal onboarding, path ownership, verification, journal-proposal, integration, and review rules. Skip only the tracked-worker preflight and task-state operations.

## Enter Through the Task Suite

When requested work maps to an existing tracker task or `planning-tasks` produced an accepted task graph:

1. Invoke `managing-tasks`.
2. Require `task verify` to exit 0 before dispatch. Return invalid task definitions to planning or fix them within granted authority.
3. Use `task list --ready` only to find candidates.
4. Run `task show <id>` for every candidate; it is the briefing source for `kind`, `context[]`, files, dependencies, tests, notes, and subtasks.
5. Assign explicit task ids. Never let a worker select or begin another task independently.

An unrelated `.tasks/` directory does not force untracked work into the task suite. Use the classification above when no matching task exists.

## Build Parallel Waves

Apply parallel waves only to tracked task graphs. Keep untracked medium work with its single assigned worker.

Parallelize workers when every pair of tasks satisfies all conditions:

- both are ready and neither depends on the other
- declared and discovered write surfaces do not overlap
- neither owns a generated artifact consumed or regenerated by the other
- tests and commands do not mutate the same database, fixtures, services, ports, or other runtime state
- no unresolved architecture, user preference, external action, or authority question blocks either task

Spawn more than one worker when useful and capacity permits. Keep one worker per overlapping write surface. If a worker discovers an undeclared path or shared side effect, it stops before touching it and returns the conflict to the orchestrator.

After each wave, integrate results, refresh tracker state, and recalculate the ready set. Do not run review between tasks or waves.

## Onboard Implementation Agents

Before spawning a wave, checkpoint the orchestrator's active session through `journaling-session-memory`.

Every new implementation worker and code/PR reviewer performs read-only delegated onboarding before task work:

1. Invoke `journaling-session-memory` and follow its onboarding retrieval order.
2. Read `COMMON.md` whole.
3. Read the orchestrator's active session file, Handoff first when present; otherwise read its active Log.
4. Read task-linked and topic-linked historical Handoffs only when relevant.
5. Compare branch, HEAD, and working-tree state; report unexplained differences before editing or reviewing.

These delegated agents do not create session files or edit session journals or `COMMON.md`. This single-writer adaptation avoids concurrent journal allocation and append races. The orchestrator owns all journal writes.

## Brief the Worker

Give each worker a bounded contract containing:

- task id when tracked, otherwise an assignment label; objective, definition of done, owned paths, and forbidden paths or actions
- exact project instructions, PRD, decisions, and handoffs to read
- critical facts a cold agent may miss, with an instruction to verify them against source
- required checks and how to interpret their output
- escalation triggers: ambiguity, user preference, architecture, new authority, scope collision, shared state, or third failed attempt

Every tracked worker must, before its first edit:

1. Invoke `managing-tasks` and run `task show <id>` itself.
2. Resolve `kind` through the project task-kinds table; invoke the mapped skill and read the mapped document.
3. Read or activate every `context[]` entry.
4. Set the task to `in-progress` and maintain subtask state as work advances.

The orchestrator inspects `kind` and `context[]` while scheduling but need not reload their full contents when the worker contract makes this preflight mandatory. The worker's completion evidence names the skills and documents it loaded.

Every untracked worker must name the primed skills, documents, and task evidence it loaded. It does not invoke `managing-tasks`, create a task, or update tracker state.

Workers may edit only assigned working-tree paths. They never stage, commit, push, deploy, or communicate externally. The orchestrator alone owns the Git index and commits, subject to user and project authorization.

## Receive Journal Proposals

At every `journaling-session-memory` checkpoint trigger, an implementation worker sends patch-like proposals through its response or an agent message. A delegated reviewer retains review state and returns complete proposals at completion, interruption, or an orchestrator-requested checkpoint. Do not use line numbers; use paths, sections, task ids, and C/D/Q anchors that survive concurrent edits.

Required proposal shape:

```text
Journal proposal
target: <orchestrator session path>
append to: ## Log
entries:
- <typed entry: decision | discovered | abandoned | done | correction>

Task-note proposal
task: <id> | none
note: <task-scoped evidence or none>

COMMON proposal
action: ADD | KEEP | REPLACE | RETIRE | PROMOTE | none
anchor: <C/D/Q id or new-entry subject>
text: <proposed dense entry or none>
evidence: <task id, paths, commands, and observed result>

Handoff facts
work: <completed, partial, and pending actions>
next: <immediate continuation>
questions: <blocking questions or none>
state: <tree, exceptional loads, and retrieval hints>
```

The orchestrator verifies evidence, writes accepted task notes and Log entries promptly, and decides every COMMON action through `journaling-session-memory` checkpoint rules. Use `task: none` when no tracker task owns the evidence. For `ADD`, the subagent proposes a subject and text; the orchestrator allocates the new C/D/Q anchor after approval. It may accept, edit, or reject any proposal. Only the orchestrator writes task notes and edits session journals or `COMMON.md`; a proposal is never approval.

The orchestrator derives its final Handoff during offboard. It does not add a Handoff section mid-session merely because a worker returned Handoff facts.

## Supervise and Integrate

While workers run:

- answer questions with source evidence or escalate them
- inspect one layer beyond each assignment for downstream consumers, shared state, cleanup behavior, and integration contracts
- redirect work when new evidence invalidates the assignment
- stop repeated variations after the third failed attempt; simplify and ask
- inspect each worker's diff, verification output, tracker state, and journal proposals before accepting it

Do not redo a worker's assignment to gain confidence. Return defects to a worker. After a wave stabilizes, the orchestrator stages explicit accepted paths and creates authorized commits without including another worker's unfinished changes.

## Run One Serial Review

Review only after the implementation batch is integrated and stable. Do not parallelize reviewers or `reviewing-code` passes.

1. Spawn one reviewer that did not implement the work.
2. Require delegated onboarding and invocation of `reviewing-code`.
3. Give it the accepted objective, base and head, project rules, antipattern routes, and stable integrated artifact. Do not leak worker conclusions, suspected bugs, or a preferred verdict unless testing a named hypothesis.
4. Require it to build the `reviewing-code` checklist and run the passes in order.
5. Require one final response containing the completed review state, findings, and journal proposals. Record accepted proposals after verification.
6. Require every finding to follow `reviewing-code` severity, evidence, impact, correction, and deduplication rules.

Commit the integrated stable batch before branch review. If commit authority is unavailable, pause and ask the user; do not adapt `reviewing-code` to an uncommitted artifact or claim complete branch review.

## Adjudicate Findings

For every finding:

1. Verify quoted evidence against the artifact.
2. Classify it as accepted, rejected, duplicate, or user decision required.
3. Return accepted implementation defects to a worker.
4. Reverify fixes and resume the same reviewer for serial re-review of material changes.
5. Record the ruling through task, journal, and COMMON proposal handling.

Resolve implementation disputes from source, tests, specifications, and reproducible behavior. Escalate user preferences, high-level design or architecture, meaningful scope changes, new authority, material risk acceptance, and conflicting requirements without authoritative precedence. Present options, evidence, and tradeoffs; do not choose for the user.

## Integration Gate

Before claiming completion, verify every item:

- [ ] The execution shape satisfies the direct-work threshold and project rules, or an explicit user-approved change is recorded.
- [ ] Untracked work was classified as small, medium, or heavy; medium work received one context-primed worker, and heavy work was offered `planning-tasks` when planning would reduce risk.
- [ ] `task verify` passed when the task suite applies; every tracked worker invoked `managing-tasks`, ran `task show <id>` itself, and received one explicit ready task id. Untracked workers skipped tracker-only operations.
- [ ] Parallel-wave tasks had disjoint dependencies, write surfaces, generated artifacts, and mutable runtime state.
- [ ] Every implementation worker and code/PR reviewer completed delegated onboarding before work.
- [ ] Every tracked worker resolved `kind`, invoked its mapped skill, and loaded the mapped document plus all `context[]` entries before editing.
- [ ] Tracked workers maintained task state; all workers stopped on undeclared scope, shared state, escalation triggers, and third failed attempts.
- [ ] Workers did not stage, commit, push, deploy, or communicate externally; the orchestrator staged explicit paths and created only authorized commits.
- [ ] The orchestrator checked one layer beyond each assignment and reconciled every worker's diff, checks, tracker state, and proposals.
- [ ] Every worker checkpoint trigger produced all proposal fields. Delegated reviewers returned complete proposals at completion, interruption, or an orchestrator-requested checkpoint. Only the orchestrator wrote accepted task notes, session Log entries, and COMMON changes.
- [ ] Every accepted journal or COMMON edit has evidence and follows `journaling-session-memory` authority, including orchestrator allocation of new C/D/Q anchors.
- [ ] The orchestrator committed the integrated stable batch before review or paused for commit authority.
- [ ] One independent reviewer invoked `reviewing-code` against the stable committed batch; review agents and passes were not parallelized, and the reviewer never implemented fixes.
- [ ] Every finding has an evidence-backed disposition; material fixes were reverified and serially re-reviewed.
- [ ] User preferences and high-level decisions were escalated; accepted risks and unresolved questions are explicit.
- [ ] Required checks ran and their output was inspected.
- [ ] Tracker, journal, Git, and working-tree state support the completion claim.

Report the integrated outcome, task and commit evidence, review dispositions, accepted risks, and remaining decisions.
