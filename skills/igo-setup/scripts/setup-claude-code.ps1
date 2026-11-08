<#
  IGO Group - Claude Code one-shot setup (Windows)
  Installs Claude Code + top plugins/skills at USER scope, so they are active
  in EVERY project automatically. Skills trigger on their own by context.

  Run in PowerShell (normal user, not admin):
    Set-ExecutionPolicy -Scope Process Bypass -Force
    .\setup-claude-code.ps1              # recommended set
    .\setup-claude-code.ps1 -IncludeECC  # also add ECC (overlaps Superpowers)
    .\setup-claude-code.ps1 -SecurityProfile strict   # security profile: strict | normal | open
    .\setup-claude-code.ps1 -SkipAudit        # skip pre-install security audit
    .\setup-claude-code.ps1 -VaultPath D:\IGO-Brain -BrainName "Vignesh A"   # Obsidian second brain
    .\setup-claude-code.ps1 -NoBrain          # skip Obsidian second brain
#>
param([switch]$IncludeECC, [switch]$SkipAudit, [ValidateSet('strict','normal','open')][string]$SecurityProfile = 'normal',
      [switch]$NoBrain, [string]$VaultPath = "$HOME\Documents\IGO-Brain", [string]$BrainName = $env:USERNAME, [string]$BrainPreset = 'executive',
      [string]$TeamLogDir = '', [string]$TeamName = '')

$ErrorActionPreference = 'Continue'
$failed = @()
function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Has($c)  { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
              [Environment]::GetEnvironmentVariable('Path','User') + ";$HOME\.local\bin"
}

# ---------- 1. Prerequisites ----------
Step 'Checking prerequisites (Git, Node.js, uv)'
if (-not (Has git))  { winget install -e --id Git.Git --silent --accept-package-agreements --accept-source-agreements }
if (-not (Has node)) { winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements }
if (-not (Has uv))   { winget install -e --id astral-sh.uv --silent --accept-package-agreements --accept-source-agreements }
Refresh-Path

# ---------- 2. Claude Code ----------
Step 'Installing / updating Claude Code'
if (-not (Has claude)) { Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression; Refresh-Path }
else { claude update }
if (-not (Has claude)) { Write-Host 'Claude Code not on PATH. Open a new terminal and re-run.' -ForegroundColor Red; exit 1 }

# ---------- 3. Security audit BEFORE install (IGO Security Guard) ----------
$sec = Join-Path $PSScriptRoot '..\..\..\scripts\igo-sec.js'
$blockedMarkets = @()
$audit = [ordered]@{
  'superpowers-marketplace' = 'obra/superpowers'
  'claude-code-workflows'   = 'wshobson/agents'
  'thedotmack'              = 'thedotmack/claude-mem'
  'addy-agent-skills'       = 'addyosmani/agent-skills'
  'ui-ux-pro-max-skill'     = 'nextlevelbuilder/ui-ux-pro-max-skill'
  'obsidian-second-brain'   = 'eugeniughelbur/obsidian-second-brain'
}
if ($IncludeECC) { $audit['ecc'] = 'affaan-m/ECC' }
if (-not $SkipAudit -and (Test-Path $sec)) {
  Step 'Auditing third-party plugins before install'
  foreach ($k in $audit.Keys) {
    $repo = $audit[$k]
    $res = node $sec audit $repo --json 2>$null | Out-String
    try { $j = $res | ConvertFrom-Json } catch { $j = $null }
    if ($j) {
      $color = @{SAFE='Green'; REVIEW='Yellow'; BLOCK='Red'}[$j.verdict]
      Write-Host ("  {0,-38} {1,-7} score {2}/100  (critical {3}, high {4})" -f $repo, $j.verdict, $j.score, $j.counts.critical, $j.counts.high) -ForegroundColor $color
      if ($j.verdict -eq 'BLOCK') { $blockedMarkets += $k }
    } else { Write-Host "  $repo  audit failed - installing anyway" -ForegroundColor Yellow }
  }
  Write-Host "  Full reports: $HOME\.claude\igo-security\audits"
}

# ---------- 3b. Marketplaces ----------
Step 'Adding plugin marketplaces'
$markets = @(
  'anthropics/claude-plugins-official',   # claude-plugins-official
  'anthropics/skills',                    # anthropic-agent-skills
  'obra/superpowers-marketplace',         # superpowers-marketplace
  'wshobson/agents',                      # claude-code-workflows
  'thedotmack/claude-mem',                # thedotmack
  'addyosmani/agent-skills',              # addy-agent-skills
  'nextlevelbuilder/ui-ux-pro-max-skill', # ui-ux-pro-max-skill
  'eugeniughelbur/obsidian-second-brain'  # obsidian-second-brain
)
if ($IncludeECC) { $markets += 'affaan-m/ECC' }  # ecc
foreach ($m in $markets) { claude plugin marketplace add $m }

# ---------- 4. Plugins (user scope = on in every project) ----------
Step 'Installing plugins at user scope'
$plugins = @(
  # Anthropic official
  'context7@claude-plugins-official',            # live library docs
  'feature-dev@claude-plugins-official',
  'code-review@claude-plugins-official',
  'pr-review-toolkit@claude-plugins-official',
  'code-simplifier@claude-plugins-official',
  'commit-commands@claude-plugins-official',
  'security-guidance@claude-plugins-official',   # warns on risky code (compliance)
  'frontend-design@claude-plugins-official',
  'claude-md-management@claude-plugins-official',
  'typescript-lsp@claude-plugins-official',
  'pyright-lsp@claude-plugins-official',
  'playwright@claude-plugins-official',          # browser testing
  'supabase@claude-plugins-official',
  'vercel@claude-plugins-official',
  # Anthropic skills: docx / xlsx / pptx / pdf
  'document-skills@anthropic-agent-skills',
  # Superpowers: plan -> test -> build -> review
  'superpowers@superpowers-marketplace',
  # wshobson specialist agents (ERP / web / automation)
  'backend-development@claude-code-workflows',
  'frontend-mobile-development@claude-code-workflows',
  'database-design@claude-code-workflows',
  'security-compliance@claude-code-workflows',
  'cicd-automation@claude-code-workflows',
  'debugging-toolkit@claude-code-workflows',
  # Memory across sessions
  'claude-mem@thedotmack',
  # Engineering skills
  'agent-skills@addy-agent-skills',
  # UI/UX design
  'ui-ux-pro-max@ui-ux-pro-max-skill',
  # Second brain (Obsidian)
  'obsidian-second-brain@obsidian-second-brain'
)
if ($IncludeECC) { $plugins += 'ecc@ecc' }

foreach ($p in $plugins) {
  if ($blockedMarkets -contains ($p -split '@')[1]) { Write-Host "  x $p  (skipped: audit verdict BLOCK)" -ForegroundColor Red; $failed += "$p (blocked by audit)"; continue }
  Write-Host "  - $p"
  claude plugin install $p --scope user
  if ($LASTEXITCODE -ne 0) { $failed += $p }
}

# ---------- 5. CLI tools ----------
Step 'Installing RTK (token saver, auto hook)'
if (-not (Has rtk)) { winget install -e --id rtk-ai.rtk --silent --accept-package-agreements --accept-source-agreements; Refresh-Path }
if (Has rtk) { rtk init -g } else { $failed += 'rtk' }

Step 'Installing Graphify (codebase knowledge graph)'
if (Has uv) { uv tool install graphifyy; uv tool update-shell; Refresh-Path }
if (Has graphify) { graphify install } else { $failed += 'graphify' }

# ---------- 6. Global instructions: auto-use everything silently ----------
Step 'Writing global CLAUDE.md'
$claudeDir = Join-Path $HOME '.claude'
New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null
$md = Join-Path $claudeDir 'CLAUDE.md'
$rules = Join-Path $PSScriptRoot '..\..\..\hooks\rules.md'
if (-not (Test-Path $rules)) { $rules = Join-Path $PSScriptRoot 'CLAUDE.md' }
$block = Get-Content $rules -Raw
if (Test-Path $md) {
  if (-not (Select-String -Path $md -Pattern 'IGO-AUTO-SKILLS' -Quiet)) { Add-Content $md "`n$block" }
} else { Set-Content $md $block -Encoding UTF8 }

# ---------- 7. IGO Security Guard ----------
Step 'Activating IGO Security Guard'
if (Test-Path $sec) { node $sec init; node $sec profile $SecurityProfile; if ($TeamLogDir) { if ($TeamName) { node $sec team setup --dir $TeamLogDir --name $TeamName } else { node $sec team setup --dir $TeamLogDir } }; node $sec selftest } else { Write-Host '  igo-sec not found (run from the plugin folder)' -ForegroundColor Yellow }

# ---------- 8. Obsidian second brain ----------
if (-not $NoBrain) {
  Step 'Setting up Obsidian second brain'
  $brain = Join-Path $PSScriptRoot '..\..\..\scripts\igo-brain.js'
  if (Test-Path $brain) { node $brain --vault $VaultPath --name $BrainName --preset $BrainPreset --no-claude; if ($LASTEXITCODE -ne 0) { $failed += 'second-brain' } }
}

# ---------- 9. Summary ----------
Step 'Installed plugins'
claude plugin list
if ($failed.Count) {
  Write-Host "`nNeeds attention:" -ForegroundColor Yellow
  $failed | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
  Write-Host "`nAll done. Open any project and run: claude" -ForegroundColor Green
}
Write-Host 'Supabase / Vercel plugins ask you to sign in the first time they are used.'
