# IGO Dev Stack - one-line installer for a new Windows PC
#
#   irm https://raw.githubusercontent.com/igogroupofcompanies/igo-dev-stack/main/install.ps1 | iex
#
# Optional settings (set before running):
#   $env:IGO_NAME = "Vignesh A"        # name for the Obsidian vault
#   $env:IGO_PROFILE = "strict"        # security profile: strict | normal | open
#   $env:IGO_NO_BRAIN = "1"            # skip Obsidian second brain
#   $env:IGO_ECC = "1"                 # also install ECC
#   $env:IGO_REPO = "owner/repo"       # use a fork
#   $env:IGO_BRANCH = "main"

& {   # scoped so the caller's session settings are not changed by irm | iex
  $ErrorActionPreference = 'Stop'
  $Repo   = if ($env:IGO_REPO)   { $env:IGO_REPO }   else { 'igogroupofcompanies/igo-dev-stack' }
  $Branch = if ($env:IGO_BRANCH) { $env:IGO_BRANCH } else { 'main' }
  $Dest   = Join-Path $HOME '.igo-dev-stack'

  Write-Host "`nIGO Dev Stack installer  ($Repo@$Branch)" -ForegroundColor Cyan
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

  # 1. Download the plugin (no git needed)
  $tmp = Join-Path $env:TEMP ("igo-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zip = Join-Path $tmp 'stack.zip'
  Write-Host '==> Downloading'
  Invoke-WebRequest "https://github.com/$Repo/archive/refs/heads/$Branch.zip" -OutFile $zip -UseBasicParsing
  Expand-Archive $zip -DestinationPath $tmp -Force
  $src = Get-ChildItem $tmp -Directory | Select-Object -First 1
  if (-not (Test-Path (Join-Path $src.FullName '.claude-plugin\plugin.json'))) { throw 'Downloaded archive is not the igo-dev-stack plugin.' }

  # 2. Install / update into ~/.igo-dev-stack (keeps nothing else of yours in there)
  if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
  Move-Item $src.FullName $Dest
  Remove-Item $tmp -Recurse -Force
  Get-ChildItem $Dest -Recurse -File | Unblock-File
  Write-Host "  Installed to $Dest"

  # 3. Run the full setup (Git, Node, uv, Claude Code, audited plugins, security guard, second brain)
  $setupArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $Dest 'skills\igo-setup\scripts\setup-claude-code.ps1'))
  if ($env:IGO_PROFILE)  { $setupArgs += @('-SecurityProfile', $env:IGO_PROFILE) }
  if ($env:IGO_NAME)     { $setupArgs += @('-BrainName', $env:IGO_NAME) }
  if ($env:IGO_NO_BRAIN) { $setupArgs += '-NoBrain' }
  if ($env:IGO_ECC)      { $setupArgs += '-IncludeECC' }
  & powershell.exe @setupArgs

  # 4. Register igo-dev-stack itself in Claude Code (from GitHub, so /plugin update works later)
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ";$HOME\.local\bin"
  if (Get-Command claude -ErrorAction SilentlyContinue) {
    Write-Host "`n==> Adding igo-dev-stack to Claude Code"
    $ErrorActionPreference = 'Continue'
    claude plugin marketplace add $Repo
    if ($LASTEXITCODE -ne 0) { Write-Host '  GitHub marketplace not reachable - using the downloaded copy'; claude plugin marketplace add $Dest }
    claude plugin install igo-dev-stack@igo-group --scope user
    Write-Host "`nDone. Restart Claude Code. Then just type what you need - skills are picked automatically." -ForegroundColor Green
  } else {
    Write-Host "`nClaude Code is not on PATH yet. Open a NEW PowerShell window and run:" -ForegroundColor Yellow
    Write-Host "  claude plugin marketplace add $Repo"
    Write-Host "  claude plugin install igo-dev-stack@igo-group --scope user"
  }
}
