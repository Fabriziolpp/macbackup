#!/bin/bash
# Copia nel repo mac-backup tutto ciò che va salvato prima della migrazione del Mac.
# Escluso: Desktop, Downloads, Sante Data, file .env, cache e tutto ciò che si rigenera.
# Uso: bash scripts/backup.sh            (dalla radice del repo)
set -euo pipefail

DEST="$(cd "$(dirname "$0")/.." && pwd)"
EXCLUDES="$DEST/scripts/excludes.txt"

# copy_dir <cartella sorgente> <destinazione relativa nel repo>
copy_dir() {
  if [ ! -d "$1" ]; then echo "  (manca, salto) $1"; return; fi
  mkdir -p "$DEST/$2"
  # --delete-excluded: toglie dal repo anche i file diventati esclusi dopo un backup precedente
  rsync -a --delete --delete-excluded --exclude-from="$EXCLUDES" "$1/" "$DEST/$2/"
  echo "  ok  $2"
}

# copy_file <file sorgente> <destinazione relativa nel repo>
copy_file() {
  if [ ! -f "$1" ]; then echo "  (manca, salto) $1"; return; fi
  mkdir -p "$(dirname "$DEST/$2")"
  cp -p "$1" "$DEST/$2"
  echo "  ok  $2"
}

# bundle_repo <repo git> <nome>: tutta la storia (anche i commit non pushati) in un unico file
bundle_repo() {
  if [ ! -d "$1/.git" ]; then echo "  (non è un repo git, salto) $1"; return; fi
  mkdir -p "$DEST/projects/_git-bundles"
  git -C "$1" bundle create "$DEST/projects/_git-bundles/$2.bundle" --all 2>/dev/null
  git -C "$1" remote -v > "$DEST/projects/_git-bundles/$2.remotes.txt"
  echo "  ok  projects/_git-bundles/$2.bundle"
}

echo "== Claude Code"
copy_file "$HOME/.claude/settings.json"                    "claude/settings.json"
copy_file "$HOME/.claude/plugins/installed_plugins.json"   "claude/plugins/installed_plugins.json"
copy_file "$HOME/.claude/plugins/known_marketplaces.json"  "claude/plugins/known_marketplaces.json"
for skill in "$HOME/.claude/skills"/*/; do
  name="$(basename "$skill")"
  # "synced" viene riscaricata da claude.ai al login
  [ "$name" = "synced" ] && continue
  copy_dir "$skill" "claude/skills/$name"
done
for mem in "$HOME/.claude/projects"/*/memory; do
  [ -d "$mem" ] || continue
  copy_dir "$mem" "claude/projects/$(basename "$(dirname "$mem")")/memory"
done

echo "== Dotfiles e configurazioni"
copy_file "$HOME/.zshrc"                  "dotfiles/.zshrc"
copy_file "$HOME/.config/git/ignore"      "dotfiles/.config/git/ignore"
copy_file "$HOME/.gitconfig"              "dotfiles/.gitconfig"
copy_file "$HOME/.warp/settings.toml"     "dotfiles/.warp/settings.toml"
copy_file "$HOME/.vscode/argv.json"       "dotfiles/.vscode/argv.json"
VSCODE_USER="$HOME/Library/Application Support/Code/User"
copy_file "$VSCODE_USER/settings.json"    "dotfiles/vscode-user/settings.json"
copy_dir  "$VSCODE_USER/snippets"         "dotfiles/vscode-user/snippets"

echo "== Elenco app e strumenti"
mkdir -p "$DEST/apps"
ls /Applications > "$DEST/apps/applications.txt"
ls "$HOME/Applications" > "$DEST/apps/user-applications.txt"
ls "$HOME/.vscode/extensions" > "$DEST/apps/vscode-extensions.txt" 2>/dev/null || true
ls "$HOME/.nvm/versions/node" > "$DEST/apps/node-versions.txt" 2>/dev/null || true
ls "$HOME"/.nvm/versions/node/*/lib/node_modules > "$DEST/apps/npm-globals.txt" 2>/dev/null || true
echo "  ok  apps/"

echo "== Documenti"
copy_dir "$HOME/Documents/Claude"         "documents/Claude"
copy_dir "$HOME/Documents/Obsidian Vault" "documents/Obsidian Vault"

echo "== Progetti"
copy_dir "$HOME/PPTcreator"               "projects/PPTcreator"
copy_dir "$HOME/allenamenti-app"          "projects/allenamenti-app"
copy_dir "$HOME/allenamenti-app copia"    "projects/allenamenti-app copia"
copy_dir "$HOME/allenamenti-app backup"   "projects/allenamenti-app backup"
bundle_repo "$HOME/allenamenti-app"       "allenamenti-app"
bundle_repo "$HOME/allenamenti-app copia" "allenamenti-app-copia"

echo "== Cartelle vuote"
# git non salva le cartelle vuote: un .gitkeep ne conserva la struttura
find "$DEST" -path "$DEST/.git" -prune -o -type d -empty -print -exec touch {}/.gitkeep \; | sed "s|$DEST/|  .gitkeep in |"

echo "== Fatto. Ora esegui: bash scripts/publish.sh"
