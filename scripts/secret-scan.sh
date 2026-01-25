#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PATTERN='(github_pat_|AKIA|AIza|sk-[A-Za-z0-9]|STRAICO_API_KEY=|PERPLEXITY_API_KEY=|SMTP_PASS=|POSTGRES_PASSWORD=|ADMIN_PASS=<redacted>

echo "Running secret scan in $(pwd)..."
if command -v rg >/dev/null 2>&1; then
  rg -n --hidden -g '!*node_modules/*' -g '!*data/*' -g '!*logs/*' -g '!*\.git/*' "$PATTERN" || true
else
  grep -R -n -E "$PATTERN" . || true
fi
echo "Scan completed."
