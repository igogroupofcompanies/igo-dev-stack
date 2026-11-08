# Harness
The loop every agent follows:
1. **Orient** — read AGENTS.md, MEMORY.md, TASKS.md, CONTEXT_MAP.md
2. **Route** — pick agent/skill via ROUTING.md
3. **Plan** — PLAN.md (skip only for trivial edits)
4. **Build** — test first, small commits
5. **Verify** — unit → E2E browser → security tests (SELF_HEAL_LOOP.md on failure, max 3 rounds)
6. **Eval** — EVALS.md checks pass
7. **Handoff** — HANDOFF.md + update TASKS/MEMORY
Context budget: load only what CONTEXT_MAP lists for the task; summarise, don't paste.
