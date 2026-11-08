#!/usr/bin/env bash
# IGO Dev Stack - one-line installer for macOS / Linux
#
#   curl -fsSL https://raw.githubusercontent.com/igogroupofcompanies/igo-dev-stack/main/install.sh | bash
#
# Optional env: IGO_TEAM_DIR=/path/to/team-folder  IGO_NAME="Vignesh A"  IGO_PROFILE=strict|normal|open  IGO_NO_BRAIN=1  IGO_ECC=1  IGO_REPO=owner/repo  IGO_BRANCH=main
set -euo pipefail
REPO="${IGO_REPO:-igogroupofcompanies/igo-dev-stack}"
BRANCH="${IGO_BRANCH:-main}"
DEST="$HOME/.igo-dev-stack"

printf '\n\033[36mIGO Dev Stack installer (%s@%s)\033[0m\n' "$REPO" "$BRANCH"
TMP="$(mktemp -d)"
echo "==> Downloading"
curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" | tar -xz -C "$TMP"
SRC="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -1)"
[ -f "$SRC/.claude-plugin/plugin.json" ] || { echo "Downloaded archive is not the igo-dev-stack plugin."; exit 1; }
rm -rf "$DEST"; mv "$SRC" "$DEST"; rm -rf "$TMP"
echo "  Installed to $DEST"

ARGS=()
[ -n "${IGO_PROFILE:-}" ] && ARGS+=("--profile=$IGO_PROFILE")
[ -n "${IGO_NAME:-}" ] && ARGS+=("--name=$IGO_NAME")
[ -n "${IGO_NO_BRAIN:-}" ] && ARGS+=("--no-brain")
[ -n "${IGO_ECC:-}" ] && ARGS+=("--ecc")
[ -n "${IGO_TEAM_DIR:-}" ] && ARGS+=("--team-dir=$IGO_TEAM_DIR" "--team-name=${IGO_NAME:-$(id -un)}")
bash "$DEST/skills/igo-setup/scripts/setup-claude-code.sh" ${ARGS[@]+"${ARGS[@]}"} || true

export PATH="$HOME/.local/bin:$PATH"
if command -v claude >/dev/null 2>&1; then
  echo; echo "==> Adding igo-dev-stack to Claude Code"
  claude plugin marketplace add "$REPO" || true
  claude plugin install igo-dev-stack@igo-group --scope user || true
  printf '\n\033[32mDone. Restart Claude Code, then just type what you need - skills are picked automatically.\033[0m\n'
else
  echo "Open a new terminal and run:"
  echo "  claude plugin marketplace add $REPO && claude plugin install igo-dev-stack@igo-group --scope user"
fi
