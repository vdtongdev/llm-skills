---
id: 0018
slug: sensible-default-rule
started: 2026-10-04
finalized: true
branch: master
head: 70acf14
tasks: []
topics: [skill-repository]
---

# Session 0018 - sensible-default-rule

Continues finalized session 0017.

## Log
- discovered: wigo-system (cloned to `/tmp/wigo-system`) has 55.2 comment+docstring lines per 100 code lines vs coconut 14.6; 416 vs 5 `Args:/Returns:/Raises:` lines. Its bloat is prose (decision history, caller inventories, `file:line` refs), driven by its `CLAUDE.md:70` comment rule; its overengineering was plan scope from adopting review findings (AP-064). coconut's effective guardrails limit output, not thinking.
- discovered: user's A/B test - the same web page built with the "simplest possible" rule came out bare; without it, polished. The rule hid capability, and nothing told the user what was left out.
- decision: `GLOBAL_CLAUDE.md` - replaced the "smallest change that closes an observed risk" rule with a gain x extra-cost table choosing simplest vs most sensible (cheap = coconut's definition; autopilot turns Ask into Simplest; mention), plus a held-back list ending every report. User chose table plus list over list alone, mainly for autopilot. Rejected: moving the old rule into autopilot, which kept autopilot on minimal output.
- done: `GLOBAL_CLAUDE.md` - L47 now asks for simplest plus most sensible; removed autopilot "DO NOT do more than needed" (it would override the table); manual "don't ask again" allows the Ask cell; autopilot Finish reports the held-back list.
- decision: `GLOBAL_CLAUDE.md` - UI exception: visual quality is part of the deliverable, so build the sensible design; the table still governs added features. Without it, autopilot resolves polish (HIGH or MEDIUM gain, expensive) to Simplest and ships a bare page. It also keeps the table from overriding the `frontend-design` skill.

## Handoff

### Work

- [x] `GLOBAL_CLAUDE.md`: simplest-vs-sensible gain/cost table, held-back report list, UI visual-quality exception, L47 proposal rule; committed as `70acf14`
- [ ] `~/projects/banana/CLAUDE.md`: `gitlabbing` config key plus session 0016 push-rule edit, uncommitted on branch `58-stack-upgrade`; not reachable from the dev container

### Next

1. Watch the first autopilot runs under the new table; tighten the undefined MEDIUM/LOW gain rows only if choices look inconsistent.
2. Commit the banana `CLAUDE.md` edit when the user works in banana outside the dev container.

### State

- tree: clean; pushed to `origin/master`; `~/.agents/skills` mirror pulled
- retrieve: wigo-system vs coconut comment-density comparison lives in this session Log; scripts were `/tmp/density.py` and `/tmp/smells.sh` (not kept)
