---
description: Scaffold the full project blueprint (docs, .ai harness, security, Antigravity layer) into this folder or a new one
argument-hint: [target-dir] [project-name]
---
Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-blueprint.js" init $ARGUMENTS` (default: current directory). Show the output summary.
Then ask nothing further: fill `AGENTS.md` stack/commands, `docs/product/PRD.md` and `ARCHITECTURE.md` with what you know from the conversation or repo; leave genuine unknowns as `_fill_`. Finish with the 3 most important blanks for the user.
