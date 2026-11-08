---
name: igo-team-monitor
description: Team activity monitoring for Claude Code - a private admin dashboard of what each team member did, when and in which project (prompts, commands, files changed, security alerts, active time per hour and per project, day timeline). Use for "what is my team doing", "team activity", "who worked on what", "time slots", "monitor my team", "team dashboard", "set up team logging", "Google Drive logs folder".
---

# IGO Team Monitor

Each PC records its own Claude Code activity (secrets, Aadhaar, PAN masked) and uploads it to a **team folder**, **encrypted with the admin's public key**. Members can write to the folder but cannot read anyone's logs; only the admin PC (which holds the private key) can build the dashboard. The dashboard is saved on the admin PC only (`Documents/IGO-Team-Dashboard/IGO Team Activity.html`), never in the shared folder. Members see a notice at session start that logging is on.

CLI: `node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-sec.js" team <command>`

## Setup with Google Drive (admin remote, team on office network)
1. **Admin** (Google Drive): create folder `IGO-Team-Logs` in My Drive → Share → add each member's Google account as **Editor**.
2. **Admin PC**: install Google Drive for desktop, then
   `team keygen --dir "G:\My Drive\IGO-Team-Logs"` → creates the admin key (private key stays in `~/.claude/igo-security/team-admin-private-key.pem` - back it up offline) and puts the public key in the folder. Note the fingerprint.
3. **Each member PC**: install Google Drive for desktop, signed in with their Google account. In drive.google.com → *Shared with me* → right-click `IGO-Team-Logs` → **Organize → Add shortcut to My Drive**. The folder then appears at `G:\My Drive\IGO-Team-Logs`.
   Then: `team setup --dir "G:\My Drive\IGO-Team-Logs" --name "<Member Name>"` (check the printed key fingerprint matches the admin's).
   Or at install: `$env:IGO_TEAM_DIR="G:\My Drive\IGO-Team-Logs"; $env:IGO_NAME="<Name>"` before the one-line installer.
4. **Admin PC**: `team report` (opens the dashboard) and `team schedule` (rebuilds it every 30 min).

## Dashboard
KPIs (active time, members active today, prompts, commands + failures, files changed, security alerts) · member list with live status (active now / today / idle) · day timeline per member coloured by project with blocked-action markers · hour-by-hour time-slot heat-map · projects with per-member split · activity feed grouped by session (prompts, commands, files, alerts) with filters and search · CSV export · light/dark · mobile.

## Rules
- Keep the member notice on (DPDP Act 2023: employees must be told). Use the data for work purposes only.
- Never put the private key in Google Drive or email it. If lost, run `team keygen --force` and have members re-run `team setup --rekey`; old logs become unreadable.
- Members with admin rights on their own PC could disable logging; check `team status` for stale "last sync" times.
