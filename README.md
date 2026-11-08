# igo-dev-stack

**A free, open-source Claude Code setup by [IGO Group](https://www.igogroups.in).**
It installs 26 of the best Claude Code plugins in one go, sets up an **Obsidian second brain**, and makes Claude use them automatically. **IGO Security Guard**, built in, checks every plugin before install and every action while Claude works.

**Step-by-step guide for admins and team members: [SETUP.md](SETUP.md)**

## Quick install (new system)

**Windows**: open PowerShell (normal, not admin) and run:
```powershell
irm https://raw.githubusercontent.com/igogroupofcompanies/igo-dev-stack/main/install.ps1 | iex
```
**macOS / Linux**:
```bash
curl -fsSL https://raw.githubusercontent.com/igogroupofcompanies/igo-dev-stack/main/install.sh | bash
```
That one line installs Git, Node, uv and Claude Code, security-audits and installs 26 plugins, switches on IGO Security Guard, sets up the Obsidian second brain, and adds igo-dev-stack to Claude Code. Restart Claude Code afterwards and type what you need; skills are picked automatically.

Options (Windows: set them first, e.g. `$env:IGO_NAME="Vignesh A"`; macOS/Linux: put them before `bash`):
`IGO_NAME` (vault owner name) · `IGO_PROFILE=strict|normal|open` · `IGO_NO_BRAIN=1` · `IGO_ECC=1`

**Already have Claude Code?** Install it from inside Claude Code instead:
```
/plugin marketplace add igogroupofcompanies/igo-dev-stack
/plugin install igo-dev-stack@igo-group
```
Then type **`igo setup`**.

**Update later:** run the same one-line installer again, or use `/plugin update igo-dev-stack`.

## What you get

| Part | What it does |
|---|---|
| `igo-setup` | Installs the full stack at user scope (all projects). Audits third-party plugins first and skips any that are BLOCKed. Windows and macOS/Linux. |
| `igo-auto-dev` | Sends each task to the right skill or agent: plan → test → build → review, live docs, UI design, backend/DB agents, security checks. |
| `igo-plugin-audit` | Scans any plugin, skill, MCP server or repo **before** it is installed. Gives a SAFE / REVIEW / BLOCK verdict and a trust score. |
| `igo-security-review` | Internal review: secrets, OWASP Top 10, DPDP personal data, vulnerable dependencies, Supabase RLS and public env exposure. |
| `igo-brain-setup` | Sets up an Obsidian second brain in one command: Obsidian, a vault (executive preset + IGO areas), 7 community plugins (security-scanned), Git backup, and Claude Code linked through `OBSIDIAN_VAULT_PATH` and the obsidian-second-brain plugin. |
| **IGO Skill Router** (hook) | On every prompt, finds the installed skills, commands and agents that match the request and has Claude use them automatically, so nobody needs to remember skill names. |
| **IGO Project Blueprint** | Standard agent-ready project structure (AGENTS.md, `.ai/` harness, `docs/`, security, Antigravity `.agents/`). It is checked automatically in every code project and adopted when missing, without overwriting anything. Commands: `/blueprint-init`, `/blueprint-adopt`, `/blueprint-audit`, `/handoff`, `/self-heal`, `/security-sweep`. 10 skills + 4 agents (planner, qa-browser, security-reviewer, red-team). |
| `igo-security-center` | Status, reports, audit log, kill switch, profiles, approved hosts, protected folders, company-wide policy. |
| Background guard (hooks) | Command firewall, intent-mismatch detection, secret protection, folder lock, prompt-injection scan, plugin watch. |

## IGO Security Guard: 24 features

**A. Before install (external plugins)**
1. Pre-install scan in a temporary clone
2. Malicious code detection: reverse shells, miners, encoded PowerShell, `eval(atob…)`, credential theft combined with network calls
3. Hidden-instruction detection in skills/agents: "ignore previous instructions", secrecy, exfiltration requests, invisible Unicode, HTML-comment instructions
4. Hook audit: every automatic hook and what it runs
5. MCP audit: commands, URLs, env vars, plain HTTP, unpinned `npx -y`
6. Dependency vulnerabilities (OSV.dev) and npm install scripts
7. Trust score 0-100 (findings, stars, licence, activity, repo age)
8. Commit pinning, with a warning when an approved plugin changes

**B. While Claude works (hooks)**
9. Command firewall: `rm -rf ~`, disk format, reverse shells, AV/firewall off, ransomware patterns, `curl | sh`, force-push, prod deploys, DB drops…
10. Intent mismatch: if you asked to "fix CSS" and the command uploads data or force-pushes, the guard escalates and explains
11. Secret protection: `.env`, SSH/AWS keys, keystores, browser credential stores, hard-coded keys in code
12. Data-leak guard: uploads to non-approved hosts, secrets in URLs or requests
13. Folder lock: writes outside the project need approval; OS folders and protected company folders are always blocked
14. Prompt-injection scan of fetched web pages, files and MCP output

**C. Internal systems**
15. OWASP Top 10 code checks · 16. Secret scan, including a pre-commit block on staged secrets · 17. DPDP Act 2023 PII checks (Verhoeff-validated Aadhaar, PAN, PII in logs, consent) · 18. Dependency audit · 19. Supabase RLS / public-env / Vercel checks

**D. Control**
20. Audit log (JSON lines) · 21. Security report · 22. Plugin allowlist (advisory or enforced) · 23. Kill switch (local or company-wide via a hosted policy file) · 24. Profiles: strict / normal / open

| Profile | Critical | High | Medium |
|---|---|---|---|
| strict | block | block | ask |
| normal (default) | block | ask | log |
| open | block | log | log |

## Install

```
/plugin marketplace add igogroupofcompanies/igo-dev-stack
/plugin install igo-dev-stack@igo-group
```
Restart Claude Code, then say **`igo setup`**. You can also run the script directly:

- Windows: `powershell -ExecutionPolicy Bypass -File skills/igo-setup/scripts/setup-claude-code.ps1 [-SecurityProfile strict] [-IncludeECC] [-SkipAudit]`
- macOS/Linux: `bash skills/igo-setup/scripts/setup-claude-code.sh [--profile=strict] [--ecc] [--skip-audit]`

## Team activity dashboard (private to the admin)
Every PC records its own Claude Code activity: sessions, prompts, commands, files changed, and security alerts. Secrets, Aadhaar and PAN numbers are masked first. Each PC uploads the logs **encrypted with the admin's public key** to a shared folder, which can be Google Drive, OneDrive or a network share. Team members can upload but cannot read anyone's logs. Only the admin PC can decrypt them and build the dashboard. The dashboard shows member status, a day timeline, an hourly heat-map, per-project time, a session-grouped activity feed, and CSV export.
```
# admin PC (once)
node scripts/igo-sec.js team keygen --dir "G:\My Drive\IGO-Team-Logs"
# each member PC
node scripts/igo-sec.js team setup  --dir "G:\My Drive\IGO-Team-Logs" --name "Ravi"
# admin PC
node scripts/igo-sec.js team report      # opens Documents/IGO-Team-Dashboard/IGO Team Activity.html
node scripts/igo-sec.js team schedule    # auto-refresh every 30 min
```

## Automatic skill routing
You or your team just type the request. For every prompt, the router scores all enabled skills, commands and agents (from every installed plugin, `~/.claude/skills` and the project's `.claude/skills`) against the request. It combines keyword relevance with high-precision intent rules (bug, UI, deploy, security, documents, memory and so on), then passes the best 1-4 matches to Claude to use automatically.
```
node scripts/igo-sec.js route "the login page is broken after deploy"   # see what it would pick
node scripts/igo-sec.js router off                                      # disable
```

## Project blueprint
```
node scripts/igo-blueprint.js init  ./new-app "Farmers App"   # new project
node scripts/igo-blueprint.js adopt ./existing-erp            # existing project (never overwrites)
node scripts/igo-blueprint.js audit .                         # completeness %, stubs, tracked secrets
```
Default mode is `auto`: when coding starts in a project without `AGENTS.md` + `.ai/`, Claude adopts the blueprint first and fills it from the real code. Use `igo-sec blueprint suggest` to only suggest it, or `off` to disable.

## Second brain (Obsidian)
Obsidian keeps your notes as plain Markdown files in a local folder (the *vault*). With obsidian-second-brain, Claude reads and maintains that vault, so project history, decisions, people and ideas carry over between sessions.

```
node scripts/igo-brain.js --vault "C:/Users/you/Documents/IGO-Brain" --name "Your Name" --preset executive
```
This runs as part of `igo setup` unless you pass `-NoBrain` / `--no-brain`. It is safe to re-run; your existing notes are kept. Then open the folder in Obsidian (choose *Trust author and enable plugins*) and run `/obsidian-second-brain:obsidian-init` in Claude Code.

## CLI

```
node scripts/igo-sec.js help
node scripts/igo-sec.js audit owner/repo          # before installing anything
node scripts/igo-sec.js review ./my-erp           # internal security review
node scripts/igo-sec.js report --days 7           # weekly report
node scripts/igo-sec.js quarantine bad@market     # kill switch
node scripts/igo-sec.js profile strict
node scripts/igo-sec.js selftest
```
Data lives in `~/.claude/igo-security/` (config, audit.log, audits, reviews, reports).

### Company-wide policy
```
node scripts/igo-sec.js policy export --out igo-policy.json   # approved + blocked plugins, hosts, minimum profile
# host it (e.g. raw URL in a private repo), then on every machine:
node scripts/igo-sec.js policy url https://…/igo-policy.json
```
Adding a plugin to `blocked` in that file disables it on every machine at its next session.

## Requirements
Node.js 18+, Git, and uv (for Graphify). The setup script installs any that are missing. Optional extras: `gitleaks`, `semgrep`.

## How it was tested
The selftest covers 12 attack cases. Audits were run against a deliberately malicious sample plugin (BLOCK) and against popular public plugin repos: clean repos come out SAFE; large repos that ship official installers or security tooling come out REVIEW, with the reasons listed.

## Limits
Auditing this plugin with its own scanner returns **REVIEW**. That is expected: `lib/rules.js` and the selftest contain attack signatures as data.

Pattern-based detection is a strong safety net, not a guarantee. A determined attacker can evade regex rules. Keep the strict profile for production machines, review REVIEW verdicts by hand, and rotate any key that was ever exposed.

## The stack
anthropics/claude-plugins-official · anthropics/skills · eugeniughelbur/obsidian-second-brain · obra/superpowers · wshobson/agents · thedotmack/claude-mem · addyosmani/agent-skills · nextlevelbuilder/ui-ux-pro-max-skill · rtk-ai/rtk · Graphify-Labs/graphify. This repo does not bundle third-party code; each project installs from its own repo under its own licence.

## Credits
The project blueprint (templates, harness skills, agents, commands) comes from **igo-project-blueprint** (IGO Group, MIT), ported to a cross-platform Node scaffolder.

## License
MIT © 2026 IGO Group of Companies Pvt Ltd
