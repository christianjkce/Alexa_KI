#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Security Check =="
echo "Repo: $ROOT_DIR"
echo

echo "-- Git status (tracked changes) --"
git status -sb || true
echo

echo "-- Checking for common secret patterns in tracked files --"
if command -v rg >/dev/null 2>&1; then
  rg -n --hidden --no-ignore-vcs --glob '!.git/*' --glob '!node_modules/*' --glob '!github.txt' \
    -e 'AKIA[0-9A-Z]{16}' \
    -e 'ASIA[0-9A-Z]{16}' \
    -e 'AIza[0-9A-Za-z\-_]{35}' \
    -e 'sk-[A-Za-z0-9]{20,}' \
    -e 'xox[baprs]-[A-Za-z0-9-]{10,}' \
    -e 'ghp_[A-Za-z0-9]{36,}' \
    -e 'github_pat_[A-Za-z0-9_]{20,}' \
    -e '-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----' \
    -e 'api[_-]?key\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]{16,}' \
    -e 'secret\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]{12,}' \
    -e 'token\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]{12,}' \
    -e 'password\"?\s*[:=]\s*\"?.{6,}' \
    || true
else
  grep -RIn --exclude-dir=.git --exclude-dir=node_modules --exclude=github.txt \
    -e 'AKIA[0-9A-Z]\{16\}' \
    -e 'ASIA[0-9A-Z]\{16\}' \
    -e 'AIza[0-9A-Za-z\-_]\{35\}' \
    -e 'sk-[A-Za-z0-9]\{20,\}' \
    -e 'xox[baprs]-[A-Za-z0-9-]\{10,\}' \
    -e 'ghp_[A-Za-z0-9]\{36,\}' \
    -e 'github_pat_[A-Za-z0-9_]\{20,\}' \
    -e '-----BEGIN \(RSA\|EC\|OPENSSH\) PRIVATE KEY-----' \
    -e 'api[_-]\?key\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]\{16,\}' \
    -e 'secret\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]\{12,\}' \
    -e 'token\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]\{12,\}' \
    -e 'password\"?\s*[:=]\s*\"?.\{6,\}' \
    . || true
fi
echo

echo "-- Checking for secrets in git diff --"
if command -v rg >/dev/null 2>&1; then
  git diff --unified=0 | rg -n \
    -e 'AKIA[0-9A-Z]{16}' \
    -e 'ASIA[0-9A-Z]{16}' \
    -e 'AIza[0-9A-Za-z\-_]{35}' \
    -e 'sk-[A-Za-z0-9]{20,}' \
    -e 'xox[baprs]-[A-Za-z0-9-]{10,}' \
    -e 'ghp_[A-Za-z0-9]{36,}' \
    -e 'github_pat_[A-Za-z0-9_]{20,}' \
    -e '-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----' \
    -e 'api[_-]?key\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]{16,}' \
    -e 'secret\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]{12,}' \
    -e 'token\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]{12,}' \
    -e 'password\"?\s*[:=]\s*\"?.{6,}' \
    || true
else
  git diff --unified=0 | grep -nE \
    -e 'AKIA[0-9A-Z]{16}' \
    -e 'ASIA[0-9A-Z]{16}' \
    -e 'AIza[0-9A-Za-z\-_]{35}' \
    -e 'sk-[A-Za-z0-9]{20,}' \
    -e 'xox[baprs]-[A-Za-z0-9-]{10,}' \
    -e 'ghp_[A-Za-z0-9]{36,}' \
    -e 'github_pat_[A-Za-z0-9_]{20,}' \
    -e '-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----' \
    -e 'api[_-]?key\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]{16,}' \
    -e 'secret\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]{12,}' \
    -e 'token\"?\s*[:=]\s*\"?[A-Za-z0-9_\-]{12,}' \
    -e 'password\"?\s*[:=]\s*\"?.{6,}' \
    || true
fi
echo

echo "== Security Check complete =="
