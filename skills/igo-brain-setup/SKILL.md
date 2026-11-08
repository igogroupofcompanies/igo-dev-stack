---
name: igo-brain-setup
description: Sets up an Obsidian "second brain" for Claude in one command - installs Obsidian, creates the vault (obsidian-second-brain preset + IGO areas for Compliance, ERP, Websites, Automation, IT, Security, Startups, Vendors), installs community plugins (Dataview, Kanban, Templater, Calendar, Tasks, Omnisearch, Git), links Claude Code via OBSIDIAN_VAULT_PATH and the obsidian-second-brain plugin, adds Git backup and a security check. Use for "set up Obsidian", "create my vault", "second brain setup", "connect Claude to Obsidian", "what is Obsidian for".
---

# IGO Second Brain Setup

## Purpose (explain briefly if asked)
Obsidian keeps notes as plain Markdown files in a local folder (the vault): offline, owned by the user, linkable (`[[note]]`), with a graph view and plugins. With the obsidian-second-brain plugin Claude reads and maintains the vault, so project history, decisions, people and ideas persist across sessions (save → find → daily → boards).

## Run
```
node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-brain.js" --vault "<path>" --name "<full name>" --preset executive
```
Defaults: vault `~/Documents/IGO-Brain`, preset `executive` (OKR / quarterly / weekly boards). Other presets: `builder` (dev sprints), `creator`, `researcher`, `default`.
Flags: `--style wiki` · `--remote <private git url>` · `--no-app` · `--no-plugins` · `--no-git` · `--no-claude` · `--force` (rebuild templates; notes are kept unless overwritten).
Safe to re-run: existing vaults and notes are kept.

## What it does
1. Installs Obsidian (winget / Homebrew / Flatpak).
2. Clones the obsidian-second-brain toolkit to `~/.claude/igo-tools/` and runs its vault bootstrap (needs `uv` and `git`).
3. Adds IGO areas with Dataview index pages and an `IGO Home.md`.
4. Configures daily notes (`Daily/`, `Templates/Daily Note`), templates, and new-note folder `Inbox/`.
5. Downloads and enables 7 community plugins; each `main.js` is scanned for malware patterns before enabling.
6. Creates a `.gitignore` (excludes workspace files and secrets) and a local Git repo. Push only to a **private** remote.
7. Sets `OBSIDIAN_VAULT_PATH` in `~/.claude/settings.json`, installs the obsidian-second-brain Claude Code plugin, and approves it in IGO Security Guard (pinned commit).
8. Scans the vault for secrets and Aadhaar numbers.

## After the script
Tell the user:
1. Open Obsidian → **Open folder as vault** → the vault path → **Trust author and enable plugins**.
2. Restart Claude Code inside the vault and run `/obsidian-second-brain:obsidian-init`.
3. Daily habit: `obsidian-daily` (morning), `obsidian-save` (end of work), `obsidian-find "…"` (recall), `obsidian-project`, `obsidian-decide`, `obsidian-task`.

In Cowork (no local shell): give the user the command above to run in PowerShell, or offer to run it via computer use; then ask them to add the vault folder with **Add folder**.

## Guardrails
- IGO Security Guard allows Claude to write inside the vault from any project, but asks before writing credentials or Aadhaar numbers into it.
- Do not enable the toolkit's Telegram journal integration unless the user asks (it runs a startup service and sends data to Telegram).
