---
id: 0018
slug: sensible-default-rule
started: 2026-10-04
finalized: false
branch: master
head:
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
