---
name: prototyping
description: Use when the user explicitly asks for a prototype, throwaway demo, design spike, mockup, or proof of concept where iteration speed matters more than production quality. Defines prototype mode and its overrides. Do not use for MVPs, production implementation, or hardening unless the user also requests prototype mode.
---

# Prototype Mode

Build the smallest runnable artifact that answers the current design question. Prefer iteration speed over production quality.

Prototype mode changes engineering rigor, not execution shape. Work may stay direct or use `orchestrating-agents` and `managing-tasks`.

## Enter and Exit

- Enter prototype mode only after an explicit user request.
- Identify the core path or design question before implementation. Ask when it is unclear.
- End prototype mode with the assignment. Never carry its shortcuts into later work silently.
- Exit prototype mode when the user asks to harden or productionize the result. Report the shortcuts before continuing.

## Override Contract

These rules override default workflows from the named skills while prototype mode is active. They never override user, project, system, safety, or authorization requirements.

- **`planning-tasks`:** Do not invoke it because the prototype is broad or complex. Do not create a PRD, decision record, or plan review. Use a short working outline when decomposition helps.
- **`testing-code`:** Do not start TDD, expand coverage, initialize test infrastructure, or run broad test suites. Write or run a test only when the user requests it or it is the cheapest proof of the core path.
- **`orchestrating-agents`:** Delegation and parallel workers remain available. Give every worker prototype mode and this override contract. Do not add production review gates solely because work was delegated.
- **`managing-tasks`:** Task tracking and decomposition remain available. Add `prototyping` to each prototype task's `context[]`. Do not add RED/GREEN subtasks or production test requirements by default.
- **Review workflows:** Do not invoke independent plan review, `reviewing-code`, or adversarial review unless the user or project requires it.

## Workflow

1. Define one observable core path that must work.
2. Inspect only the code and interfaces needed to reach that path.
3. Choose the shortest reversible implementation.
4. Build the core path. Stub or omit surrounding behavior.
5. Run the cheapest check that proves the core path works.
6. Show the result and ask for design feedback. Do not harden it while waiting.

## Acceptable Shortcuts

Use these as examples, not mandatory choices:

- Load a browser dependency from a CDN when the package is absent and local constraints allow it.
- Use placeholder text, stock content, or Lorem Ipsum where final content does not affect the design question.
- Use `href="#"` or no-op handlers for controls outside the core path. Mark them as non-functional.
- Use disposable CSV, JSON, or SQLite storage instead of production database infrastructure.
- Use fixtures or hardcoded representative data instead of import and administration flows.
- Mock external services instead of configuring credentials, retries, and production integrations.
- Support one representative happy path and omit unrelated edge cases.
- Keep one-use logic inline instead of creating reusable abstractions.
- Use local state instead of adding application-wide state management.
- Use plain controls or static shells instead of extending a design system.

Placeholders may surround the core path. The interaction being evaluated must actually work.

## Minimal Documentation

Document only what helps someone run, evaluate, or safely change the prototype.

- Use short docstrings for non-obvious behavior and important shortcuts.
- Skip docstrings for trivial helpers, obvious handlers, and disposable glue code.
- Comment mocked, hardcoded, or intentionally incomplete behavior.
- Record only essential startup instructions.
- Satisfy mandatory linters with the shortest useful documentation.
- Do not create architecture guides, API references, or extensive commentary.

## Safety Floor

- Never expose secrets or private data.
- Never perform destructive or irreversible data changes for convenience.
- Keep security shortcuts isolated from production and shared environments.
- Obtain normal authorization before changing production systems or external services.
- Never present mocked, hardcoded, or placeholder behavior as complete.

## Handoff

Report only:

- how to run the prototype;
- which core path works;
- what is mocked, hardcoded, missing, or disposable;
- which shortcuts must change before production use.

## Completion Gate

- [ ] Prototype mode was explicitly requested and remained limited to this assignment.
- [ ] The chosen core path works through the cheapest relevant check.
- [ ] PRDs, TDD, broad test suites, screenshots, and production review were skipped unless specifically needed or required.
- [ ] Every delegated worker received prototype mode and its override contract.
- [ ] Tasks, when used, carried `prototyping` in `context[]` and avoided default production test phases.
- [ ] Documentation is limited to running, evaluating, and identifying intentional shortcuts.
- [ ] The handoff distinguishes working behavior from mocked, hardcoded, missing, and disposable parts.
- [ ] The safety floor and all higher-priority requirements were preserved.
