---
name: handoff-memory
description: Use at the end of a session, before context fills up, or when switching agents (Claude Code ⇄ Antigravity ⇄ Codex). Writes HANDOFF.md and curates MEMORY.md/TASKS.md.
---
# Handoff & memory
1. Prepend to `.ai/harness/HANDOFF.md`: done · test state · open bug IDs · ONE next action · gotchas.
2. TASKS.md: tick only with evidence; add discovered work.
3. MEMORY.md: durable facts only (decisions, conventions, "never X because Y"); delete stale lines; no secrets.
4. Next agent starts by reading AGENTS.md → MEMORY → TASKS → latest HANDOFF.
