---
name: igo-team-monitor
description: Team activity monitoring for Claude Code - shows the admin what each team member did, when and in which project (prompts, commands, files changed, security blocks, active time per hour and per project). Use for "what is my team doing", "team activity", "who worked on what", "time slots", "monitor my team", "team dashboard", "set up team logging", "create shared folder for logs".
---

# IGO Team Monitor

Every IGO dev-stack install records Claude Code activity per member (masked: secrets, Aadhaar, PAN) to `~/.claude/igo-security/activity/<date>.jsonl`, and mirrors it to a **team folder** when one is set. Members see a notice at session start that logging is on.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-sec.js" team <command>`

## Admin: one-time setup
1. Pick the team folder:
   - **Office network**: create a share on the admin PC. Run `team share` and follow the printed PowerShell (needs Administrator). Members use `\\<ADMIN-PC>\IGO-Team-Logs`.
   - **Remote staff / no network share**: create a folder in Google Drive (or OneDrive), share it with each member (Editor), install Google Drive for desktop on each PC and use its local path, e.g. `G:\My Drive\IGO-Team-Logs` (or `G:\Shared drives\…`).
2. On the admin PC: `team setup --dir "<folder>" --name "<Admin Name>"`.
3. On each member PC: `team setup --dir "<folder>" --name "<Member Name>"`, or at install time: `$env:IGO_TEAM_DIR="<folder>"; $env:IGO_NAME="<Name>"` before the one-line installer.
4. Company-wide: add `"teamLogDir": "<folder>", "teamLogging": true` to the policy file (`policy export`, then host it) so every machine picks it up automatically.

## Admin: view
`team report --days 7`: builds `<folder>/_dashboard/igo-team-activity-<date>.html` and opens it:
- per member: active time, first → last activity, prompts, commands (failed), files changed, blocked / needed approval, top projects
- time slots: member × hour heat-map
- projects: minutes per project per member
- full timeline with filters (member, day, project, event type, text search)
`team status` lists members and their last sync.

## Rules
- Tell members logging is on (the session notice does this). Under India's DPDP Act 2023 the company must give notice of employee data processing and keep it to work purposes; keep the folder restricted to admins where possible.
- Do not turn the notice off (`teamNotice: false`) without HR/legal sign-off.
- Logging is best-effort: a member with admin rights on their own PC can disable it (`team off`). For strict control, deploy via company policy and check `team status` for members whose last sync is old.
