#!/bin/bash
# Cerca segreti nel repo prima del push. Stampa solo file:riga e tipo, mai il valore.
# Esce con 1 se trova qualcosa.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
found=0

check() { # check <etichetta> <regex>
  hits="$(grep -rnIE --exclude-dir=.git --exclude-dir=scripts -e "$2" "$ROOT" | cut -d: -f1,2)"
  if [ -n "$hits" ]; then
    found=1
    echo "## $1"
    echo "$hits" | sed "s|$ROOT/||"
  fi
}

check "Chiave Anthropic/OpenAI"   'sk-(ant-)?[A-Za-z0-9_-]{20,}'
check "Token GitHub"              '(ghp|gho|ghs|ghu)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}'
check "JWT (es. chiavi Supabase)" 'eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}'
# I bordi evitano falsi positivi dentro i font in base64
check "Chiave AWS"                '(^|[^A-Za-z0-9+/])AKIA[0-9A-Z]{16}([^A-Za-z0-9+/]|$)'
check "Chiave privata"            '-----BEGIN [A-Z ]*PRIVATE KEY-----'
check "Token Slack"               'xox[abpr]-[A-Za-z0-9-]{10,}'
check "Service role Supabase"     'SUPABASE_SERVICE_ROLE_KEY[[:space:]]*[=:][[:space:]]*[^[:space:]]{40,}'
check "Password in chiaro"        '(password|passwd|pwd)[[:space:]]*[=:][[:space:]]*["'"'"'][^"'"'"']{6,}'

echo "== File .env presenti (devono essere solo .env.example)"
find "$ROOT" -path "$ROOT/.git" -prune -o -name '.env*' -print | sed "s|$ROOT/||"

echo "== File più grandi di 50 MB (limite GitHub: 100 MB)"
find "$ROOT" -path "$ROOT/.git" -prune -o -type f -size +50M -print | sed "s|$ROOT/||"

if [ "$found" = 1 ]; then echo "ATTENZIONE: possibili segreti trovati, controlla prima del push."; exit 1; fi
echo "Nessun segreto trovato."
