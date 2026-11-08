---
name: antigravity-compat
description: Use when the project is opened in Google Antigravity (or any AGENTS.md-aware agent) so the same blueprint rules, skills and workflows apply; maps Antigravity artifacts to blueprint files.
---
# Antigravity compatibility
- Rules: `AGENTS.md` (read natively) + `.agents/rules/blueprint.md` (keep each file <12,000 chars).
- Skills: this plugin's skills are mirrored in `.agents/skills/<name>/SKILL.md`; workflows in `.agents/workflows/` (invoke with `/name`).
- Artifacts mapping: Antigravity *Plan* → `.ai/planning/PLAN.md`; *Walkthrough* → HANDOFF.md entry; *Screenshots/Browser recordings* → evidence for BUG_TRACKER/E2E_FLOWS.
- Browser: use the Antigravity browser agent under BROWSER_AGENT.md guardrails (separate Chrome profile, allowlist).
- Older installs may read `.agent/` (singular): `ln -s .agents .agent`.
