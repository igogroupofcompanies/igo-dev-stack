#!/usr/bin/env bash
# IGO Group - Claude Code one-shot setup (macOS / Linux)
# Usage: bash setup-claude-code.sh [--ecc] [--profile=strict] [--skip-audit] [--no-brain] [--vault=PATH] [--name="Full Name"] [--preset=executive]
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
FAILED=()
step(){ printf '\n\033[36m==> %s\033[0m\n' "$1"; }
has(){ command -v "$1" >/dev/null 2>&1; }
ECC=0; AUDIT=1; PROFILE=normal
TEAMDIR=""; TEAMNAME=""; BRAIN=1; VAULT="$HOME/Documents/IGO-Brain"; BNAME="$(id -un)"; BPRESET=executive
for a in "$@"; do case "$a" in --ecc) ECC=1;; --skip-audit) AUDIT=0;; --profile=*) PROFILE="${a#*=}";; --no-brain) BRAIN=0;; --vault=*) VAULT="${a#*=}";; --name=*) BNAME="${a#*=}";; --preset=*) BPRESET="${a#*=}";; --team-dir=*) TEAMDIR="${a#*=}";; --team-name=*) TEAMNAME="${a#*=}";; esac; done
SEC="$HERE/../../../scripts/igo-sec.js"; BLOCKED=""
export PATH="$HOME/.local/bin:$PATH"

step "Prerequisites (git, node, uv)"
if [ "$(uname)" = "Darwin" ] && has brew; then
  has git  || brew install git
  has node || brew install node
  has uv   || brew install uv
else
  has uv || curl -LsSf https://astral.sh/uv/install.sh | sh
  has node || echo "Install Node.js 18+ (needed for Context7/Playwright)"
fi

step "Claude Code"
if has claude; then claude update; else curl -fsSL https://claude.ai/install.sh | bash; fi
has claude || { echo "claude not on PATH - open a new terminal and re-run"; exit 1; }

if [ $AUDIT = 1 ] && [ -f "$SEC" ] && has node; then
  step "Auditing third-party plugins before install"
  PAIRS="superpowers-marketplace=obra/superpowers claude-code-workflows=wshobson/agents thedotmack=thedotmack/claude-mem addy-agent-skills=addyosmani/agent-skills ui-ux-pro-max-skill=nextlevelbuilder/ui-ux-pro-max-skill obsidian-second-brain=eugeniughelbur/obsidian-second-brain"
  [ $ECC = 1 ] && PAIRS="$PAIRS ecc=affaan-m/ECC"
  for pr in $PAIRS; do
    mk="${pr%%=*}"; repo="${pr#*=}"
    v=$(node "$SEC" audit "$repo" --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.verdict+" "+j.score+"/100 critical:"+j.counts.critical+" high:"+j.counts.high)}catch(e){console.log("FAILED")}})')
    printf '  %-40s %s\n' "$repo" "$v"
    case "$v" in BLOCK*) BLOCKED="$BLOCKED $mk";; esac
  done
  echo "  Full reports: ~/.claude/igo-security/audits"
fi

step "Marketplaces"
MARKETS=(anthropics/claude-plugins-official anthropics/skills obra/superpowers-marketplace
  wshobson/agents thedotmack/claude-mem addyosmani/agent-skills nextlevelbuilder/ui-ux-pro-max-skill eugeniughelbur/obsidian-second-brain)
[ $ECC = 1 ] && MARKETS+=(affaan-m/ECC)
for m in "${MARKETS[@]}"; do claude plugin marketplace add "$m"; done

step "Plugins (user scope)"
PLUGINS=(
  context7@claude-plugins-official feature-dev@claude-plugins-official
  code-review@claude-plugins-official pr-review-toolkit@claude-plugins-official
  code-simplifier@claude-plugins-official commit-commands@claude-plugins-official
  security-guidance@claude-plugins-official frontend-design@claude-plugins-official
  claude-md-management@claude-plugins-official typescript-lsp@claude-plugins-official
  pyright-lsp@claude-plugins-official playwright@claude-plugins-official
  supabase@claude-plugins-official vercel@claude-plugins-official
  document-skills@anthropic-agent-skills
  superpowers@superpowers-marketplace
  backend-development@claude-code-workflows frontend-mobile-development@claude-code-workflows
  database-design@claude-code-workflows security-compliance@claude-code-workflows
  cicd-automation@claude-code-workflows debugging-toolkit@claude-code-workflows
  claude-mem@thedotmack agent-skills@addy-agent-skills ui-ux-pro-max@ui-ux-pro-max-skill
  obsidian-second-brain@obsidian-second-brain
)
[ $ECC = 1 ] && PLUGINS+=(ecc@ecc)
for p in "${PLUGINS[@]}"; do
  if [[ " $BLOCKED " == *" ${p#*@} "* ]]; then echo "  x $p (skipped: audit BLOCK)"; FAILED+=("$p(blocked)"); continue; fi
  echo "  - $p"; claude plugin install "$p" --scope user || FAILED+=("$p")
done

step "RTK"
if ! has rtk; then
  if has brew; then brew install rtk; else curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh; fi
fi
has rtk && rtk init -g || FAILED+=(rtk)

step "Graphify"
has uv && { uv tool install graphifyy; uv tool update-shell; }
has graphify && graphify install || FAILED+=(graphify)

step "Global CLAUDE.md"
mkdir -p "$HOME/.claude"
RULES="$HERE/../../../hooks/rules.md"
grep -q IGO-AUTO-SKILLS "$HOME/.claude/CLAUDE.md" 2>/dev/null || { echo; cat "$RULES"; } >> "$HOME/.claude/CLAUDE.md"

step "IGO Security Guard"
if [ -f "$SEC" ]; then node "$SEC" init; node "$SEC" profile "$PROFILE"; if [ -n "$TEAMDIR" ]; then if [ -n "$TEAMNAME" ]; then node "$SEC" team setup --dir "$TEAMDIR" --name "$TEAMNAME"; else node "$SEC" team setup --dir "$TEAMDIR"; fi; fi; node "$SEC" selftest; fi

if [ $BRAIN = 1 ] && [ -f "$HERE/../../../scripts/igo-brain.js" ]; then
  step "Obsidian second brain"
  node "$HERE/../../../scripts/igo-brain.js" --vault "$VAULT" --name "$BNAME" --preset "$BPRESET" --no-claude || FAILED+=(second-brain)
fi

step "Installed"
claude plugin list
if [ ${#FAILED[@]} -gt 0 ]; then printf '\nNeeds attention: %s\n' "${FAILED[*]}"; else echo -e "\nAll done. Run: claude"; fi
