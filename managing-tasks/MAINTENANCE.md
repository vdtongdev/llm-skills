# Maintenance Config: managing-tasks

## Routing Table

| Content Type | Target | Section |
|---|---|---|
| CLI flag / command behavior change | `references/cli-reference.md` | Per-command entry |
| Task file field added / semantics changed | `references/file-format.md` | Per-field table |
| Producer integration edge case | `references/integration-contract.md` | Per-command contract |
| Exit code added / reclassified | `references/exit-codes.md` | Code table |
| New invariant or decision graph update | `SKILL.md` | Invariants / Decision graph |
| Cross-cutting workflow lesson | `SKILL.md` | Relevant section |
| Human-facing setup, walkthrough, troubleshooting | `README.md` | Relevant section |
| Recurring topic large enough to split | new `references/<topic>.md` | add row here |

## Classification Rules

- **CLI reference vs integration contract**: CLI reference documents what humans/agents type; integration contract documents the YAML shape producers parse. A new `--flag` goes to CLI reference. A changed output field goes to integration contract.
- **Invariant vs rule of thumb**: Invariants are machine-enforced (validated in `schema.mjs` or command guards). Rules of thumb (e.g., "prefer small tasks") are workflow guidance and live in `/planning-tasks`, not here.
- **SKILL.md vs reference**: SKILL.md is the activation surface (≤200 lines). Anything that grows past a paragraph belongs in a reference.
- **README vs everything else**: README is for a human setting the tracker up or getting unstuck. It may repeat a command an agent doc also carries, but never a shape or contract — those drift. Point at the reference instead.

## Contract Version Rules

- Bump `contract_version` on **breaking output change**: field renamed, field removed, or semantic shift (e.g., `created` counts differently).
- Do **not** bump on additive change (new optional field).
- When bumping, update every consumer skill's assertion and document the migration in `references/integration-contract.md`.

## File Size Thresholds

| File | Max Lines |
|---|---|
| `SKILL.md` | 200 |
| `references/cli-reference.md` | 400 |
| `references/file-format.md` | 250 |
| `references/integration-contract.md` | 250 |
| `references/exit-codes.md` | 150 |
| `README.md` | 350 |
| `MAINTENANCE.md` | 100 |

Over threshold → split by topic, add new row to routing table.

## Update Discipline

- Test counts, pass/fail status: **never** in these docs. Only invariants.
- Code examples: must run against the current CLI. If behavior changes, update the doc in the same commit as the code.
- Screenshots / ASCII art of list output: keep minimal; the formatter is the source of truth.
