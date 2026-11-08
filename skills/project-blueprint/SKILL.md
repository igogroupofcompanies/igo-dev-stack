---
name: project-blueprint
description: Use when starting a new project, adopting an existing repo, or when AGENTS.md / .ai/ / docs/ structure is missing or stale. Scaffolds and maintains the standard blueprint (docs, .ai harness, MCP/QA, security).
---
# Project Blueprint
1. Detect: does `AGENTS.md` + `.ai/` exist? (`node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-blueprint.js" check .` → exit 0 = yes)
   - Empty / new folder → `node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-blueprint.js" init . "<Project Name>"`
   - Existing code without blueprint → `node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-blueprint.js" adopt .`, then fill the docs from the real code (see /blueprint-adopt steps).
   - Unsure / periodic → `node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-blueprint.js" audit .` (completeness %, missing, stubs, tracked secrets).
   IGO default (`blueprint: auto`): do this automatically the first time coding work starts in a project that lacks it - it never overwrites files; conflicts become `*.blueprint` side-files to merge.
2. Never overwrite user files; merge `*.blueprint` side-files.
3. After scaffolding, fill from facts only (repo, conversation). Unknown = `_fill_`, never invented.
4. Keep AGENTS.md under ~150 lines; details live in the linked docs.
5. Keep CONTEXT_MAP.md accurate when folders change.
