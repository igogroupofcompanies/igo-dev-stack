---
name: igo-security-center
description: Controls IGO Security Guard - status, security report, audit log, quarantine (kill switch) or unblock a plugin, switch security profile (strict/normal/open), approved network hosts, protected folders, plugin allowlist, and company-wide policy for all machines. Use for "security status", "security report", "weekly security report", "block/quarantine this plugin", "switch to strict mode", "allow this domain", "protect this folder", "roll out policy to all machines", "why was this blocked".
---

# IGO Security Center (features 20-24, 12, 13)

All commands: `node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-sec.js" <command>`

| Need | Command |
|---|---|
| Overall status | `status` |
| Report (21) | `report --days 7` (saved to `~/.claude/igo-security/reports/`) |
| Audit log (20) | `log --tail 50` (file: `~/.claude/igo-security/audit.log`, JSON lines) |
| Kill switch (23) | `quarantine <plugin@marketplace>` → disables + blocklists; `unblock <plugin@marketplace>` |
| Profile (24) | `profile strict|normal|open` |
| Allowlist (22) | `approve <plugin@marketplace> [--repo o/r] [--sha c]`, `allowlist on|off` |
| Network hosts (12) | `egress list`, `egress add <domain>`, `egress remove <domain>` |
| Folder lock (13) | `protect <folder>` |
| All machines (22, 23) | `policy export --out igo-policy.json` → host it (private repo raw URL / igogroups.in) → on each machine `policy url <URL>` |
| Health check | `selftest` |
| Skill router | `router on|off`, test with `route "<prompt>"`, index `skills --rebuild` |
| Project blueprint | `blueprint auto|suggest|off` (auto = adopt automatically in code projects) |

## Profiles
| | strict (production / ERP) | normal (default, dev) | open (testing) |
|---|---|---|---|
| Critical (rm -rf ~, reverse shell, AV off, secret exfil) | block | block | block |
| High (force push, prod deploy, read .env, unknown upload, unaudited plugin, write outside project) | block | ask | log only |
| Medium (rm -r, sudo, env dump) | ask | log | log |
| Unapproved plugins | auto-disabled | warning | warning |
| Extra deny rules in settings.json | secrets + .env + curl\|sh | SSH/AWS/keystores | none |

## Explaining a block
Read the latest `log --tail 10` entry, name the rule and why it fired. If the user confirms it is intended: they can run it themselves, approve the host/plugin, or temporarily switch profile. Never edit `~/.claude/igo-security/config.json` or settings.json to bypass the guard without the user's explicit request.

## Weekly report
Suggest a scheduled task (Cowork) or OS scheduler running `igo-sec report --days 7` every Monday.
