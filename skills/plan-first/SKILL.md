---
name: plan-first
description: Use before building any feature or multi-file change. Brainstorm, write PLAN.md, test first, build in small steps, review the diff. Prevents rework and half-done work.
---
# Plan → Test → Build → Review
1. **Clarify** (max 3 questions, only if a wrong guess is costly). Otherwise state assumptions.
2. **Plan** in `.ai/planning/PLAN.md`: goal, approach, files, risks, test plan, rollback. Add TASKS.md items with acceptance tests.
3. **Test first**: write failing test(s) for each task.
4. **Build** smallest passing change; commit per task (Conventional Commits).
5. **Review** own diff: simplify, remove dead code, check security-touching lines, confirm docs/CHANGELOG.
6. **Prove**: paste test output/screenshot path in TASKS.md before ticking `[x]`.
Stop and ask the human on: destructive ops, auth/payment model changes, scope growth >2x plan.
