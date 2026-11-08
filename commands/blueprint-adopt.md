---
description: Adopt the blueprint in an EXISTING project - scaffold missing files, then fill them from the real codebase
---
1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-blueprint.js" adopt .` (never overwrites; conflicts become `*.blueprint` files).
2. Inspect the repo (package.json/pyproject/composer, folders, CI, env.example, migrations, routes, tests). Then fill: AGENTS.md (stack + real commands), ARCHITECTURE.md, DATABASE.md, API_SPEC.md, TESTING.md, DEPLOYMENT.md, CONTEXT_MAP.md, USER_FLOWS.md/E2E_FLOWS.md (from routes/pages), MCP_SERVERS.md.
3. Merge each `*.blueprint` side-file into the user's original, then delete it.
4. Security pass: run `node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-sec.js" review .` (secrets, OWASP, DPDP, deps, Supabase); record gaps in THREAT_MODEL.md and TASKS.md.
5. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-blueprint.js" audit .` and report remaining stubs.
