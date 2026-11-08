# IGO Claude Code Stack

## Marketplaces
claude plugin marketplace add anthropics/claude-plugins-official
claude plugin marketplace add anthropics/skills
claude plugin marketplace add obra/superpowers-marketplace
claude plugin marketplace add wshobson/agents
claude plugin marketplace add thedotmack/claude-mem
claude plugin marketplace add addyosmani/agent-skills
claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
claude plugin marketplace add eugeniughelbur/obsidian-second-brain
# optional: claude plugin marketplace add affaan-m/ECC

## Plugins (install with: claude plugin install <name> --scope user)
| Plugin | Purpose |
|---|---|
| context7@claude-plugins-official | Live library docs |
| feature-dev@claude-plugins-official | Feature workflow |
| code-review@claude-plugins-official | Diff review |
| pr-review-toolkit@claude-plugins-official | PR review agents |
| code-simplifier@claude-plugins-official | Cleanup |
| commit-commands@claude-plugins-official | Commits / PRs |
| security-guidance@claude-plugins-official | Security warnings |
| frontend-design@claude-plugins-official | UI quality |
| claude-md-management@claude-plugins-official | CLAUDE.md upkeep |
| typescript-lsp@claude-plugins-official | TS code intelligence |
| pyright-lsp@claude-plugins-official | Python code intelligence |
| playwright@claude-plugins-official | Browser testing |
| supabase@claude-plugins-official | Supabase |
| vercel@claude-plugins-official | Vercel |
| document-skills@anthropic-agent-skills | docx/xlsx/pptx/pdf |
| superpowers@superpowers-marketplace | Plan/TDD/review method |
| backend-development@claude-code-workflows | Backend agents |
| frontend-mobile-development@claude-code-workflows | Frontend/mobile agents |
| database-design@claude-code-workflows | Schema design |
| security-compliance@claude-code-workflows | Compliance |
| cicd-automation@claude-code-workflows | CI/CD |
| debugging-toolkit@claude-code-workflows | Debugging |
| claude-mem@thedotmack | Cross-session memory |
| agent-skills@addy-agent-skills | Engineering skills |
| ui-ux-pro-max@ui-ux-pro-max-skill | Design intelligence |
| obsidian-second-brain@obsidian-second-brain | Obsidian second brain (set OBSIDIAN_VAULT_PATH) |
| ecc@ecc (optional) | ECC bundle |

## Second brain
`node scripts/igo-brain.js --vault <path> --name "<name>" --preset executive`

## CLI tools
- RTK: `winget install rtk-ai.rtk` / `brew install rtk`, then `rtk init -g`
- Graphify: `uv tool install graphifyy`, then `graphify install`
