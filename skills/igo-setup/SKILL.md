---
name: igo-setup
description: Installs or repairs the IGO Claude Code stack (Superpowers, Context7, Anthropic document skills, wshobson agents, claude-mem, UI-UX Pro Max, security-guidance, RTK, Graphify) with a security audit before install and IGO Security Guard activation. Use when the user says "set up Claude Code", "install the IGO stack", "igo setup", "repair plugins", or when the session reports missing stack plugins.
---

# IGO Stack Setup

Install every stack component at user scope so it is active in all projects.

## Steps
1. Detect OS.
   - Windows: run `powershell -ExecutionPolicy Bypass -File "${CLAUDE_PLUGIN_ROOT}/skills/igo-setup/scripts/setup-claude-code.ps1"`
   - macOS / Linux: run `bash "${CLAUDE_PLUGIN_ROOT}/skills/igo-setup/scripts/setup-claude-code.sh"`
   - Add `-IncludeECC` / `--ecc` only if the user asks for ECC (overlaps Superpowers).
   - Security profile: `-SecurityProfile strict|normal|open` / `--profile=strict` (default normal).
   - Third-party plugins are audited before install; any BLOCK verdict is skipped automatically. `-SkipAudit` / `--skip-audit` disables this.
   - The script finishes by activating IGO Security Guard (`igo-sec init`, profile, `selftest`).
2. If the script cannot run (no shell, e.g. inside Cowork), show the user the commands from `references/stack.md` to paste into a terminal.
3. Report: audit verdicts, installed, failed, skipped by audit, selftest result, and anything needing sign-in (Supabase, Vercel). Tell the user to restart Claude Code.

## Repair
For a single failed plugin: `claude plugin marketplace update <marketplace>` then `claude plugin install <plugin>@<marketplace> --scope user`.

See `references/stack.md` for the full component list.
