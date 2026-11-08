---
description: Run security tests, edge checklist and prompt-injection canaries
---
Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-sec.js" review .` first (covers S5 secrets, S6 dependencies, OWASP, DPDP, Supabase RLS). Then execute `.ai/security/SECURITY_TESTS.md` (S1–S9), verify each row of `docs/security/CLOUDFLARE_EDGE.md` that can be checked from the repo/headers, and review `THREAT_MODEL.md` for new surface since last release. Output a table: test, result, fix. Stop and escalate on any S1.
