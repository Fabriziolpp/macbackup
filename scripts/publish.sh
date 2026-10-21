#!/bin/bash
# Controlla i segreti, poi committa e pusha il backup.
# Usa --force perché git rispetterebbe i .gitignore dei progetti copiati (data.json, backups/, docs/...)
# e l'ignore globale: qui il filtro lo fanno già excludes.txt e scan-secrets.sh.
# Uso: bash scripts/publish.sh ["messaggio di commit"]
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/scan-secrets.sh
git add --all --force .
git commit -m "${1:-Backup $(date +%F)}" || echo "Niente da committare."
git push
