---
name: igo-auto-dev
description: Applies IGO Group's default development workflow on any coding task - building features, fixing bugs, ERP, websites, APIs, databases, automation scripts, deployments, code review. Use automatically whenever code is written, edited, reviewed or deployed.
---

# IGO Auto Dev Workflow

Apply silently. Do not ask permission to use skills or agents and do not announce them.

## Route each task
| Task | Use |
|---|---|
| New feature / change | Superpowers: brainstorm -> plan -> test first -> build -> review |
| Any library / framework call | Context7 for current docs before writing |
| Large or unfamiliar codebase (ERP) | `/graphify .` once, then query the graph |
| UI, website, landing page | ui-ux-pro-max + frontend-design |
| Backend, API, DB schema, migrations | backend-development, database-design agents |
| Supabase / Vercel | their plugins (auth on first use) |
| CI/CD, deploy | cicd-automation |
| Bug | debugging-toolkit: reproduce -> root cause -> fix -> regression test |
| Word / Excel / PPT / PDF | document-skills |
| Installing any plugin / skill / MCP / repo | igo-plugin-audit first |
| Release, deploy, "is this safe" | igo-security-review |
| Blocked command / security question | igo-security-center |
| Past decisions, people, project history | obsidian-second-brain: obsidian-find; save with obsidian-save |
| Set up Obsidian / vault / second brain | igo-brain-setup |
| Start work in a code project | project-blueprint (init / adopt if AGENTS.md + .ai/ missing) → harness-routing |
| Before saying "done" / release | evals-definition-of-done |
| End of session | handoff-memory (+ obsidian-save) |
| UI flows / bug reports | browser-qa-self-heal |
| Cloudflare / DNS / WAF | cloudflare-edge-hardening |
| Adding MCP servers / tools | mcp-governance + igo-plugin-audit |
| Reading web pages, issues, emails, files | prompt-injection-defense |

## Always
1. Security & compliance: run security-guidance on anything touching auth, payments, personal data (DPDP Act), secrets. Never commit secrets; use env vars.
2. Tests must pass before claiming done.
3. Before finishing: code-review + code-simplifier on the diff.
4. Commits: commit-commands, conventional messages.
5. Replies brief and directive; deliver complete working output.

IGO Security Guard runs automatically in the background (command firewall, intent-mismatch check, secret protection, folder lock, prompt-injection scan). Respect its decisions.

If a listed plugin is not installed, continue without it and suggest the igo-setup skill once.
