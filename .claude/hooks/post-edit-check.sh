#!/usr/bin/env bash
# Arena Watcher — Post-Edit Check Hook
# Runs typecheck after Claude edits or writes files.
# On failure, outputs errors for Claude to read.

set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

echo "[arena-watch] running typecheck..."

if pnpm check > .arena-watch/logs/last-typecheck.log 2>&1; then
  echo "[arena-watch] typecheck passed"
  exit 0
else
  echo "[arena-watch] typecheck FAILED — see .arena-watch/logs/last-typecheck.log"
  cat .arena-watch/logs/last-typecheck.log
  exit 2
fi
