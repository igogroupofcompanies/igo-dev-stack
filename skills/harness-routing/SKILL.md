---
name: harness-routing
description: Use at the start of every task to orient (read memory/tasks/context map), route to the right agent/skill, and respect the context budget. Defines the harness loop.
---
# Harness loop
Orient (AGENTS.md, MEMORY.md, TASKS.md, last HANDOFF) → Route (ROUTING.md) → Plan → Build → Verify → Eval (EVALS.md) → Handoff.
## Context engineering
- Load only paths from CONTEXT_MAP.md for the area. Prefer search/graph over reading whole files.
- Summarise long tool output to ≤10 lines; keep raw logs in files, not in context.
- Long sessions: at ~60% context, write HANDOFF.md and continue from it rather than carrying everything.
- Parallelise independent research/review via sub-agents; keep builds sequential.
## Escalate to human
Prod data, payments, auth model, destructive ops, 3 failed heal rounds, conflicting requirements.
