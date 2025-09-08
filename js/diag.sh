#!/bin/sh
set -e

echo "=== DIAG START $(date) ==="

echo "--- ENV ---"
env | grep -i SMART_TEST_CLEANUP || true
env | grep -E "NODE_ENV|CI|PATH" || true

echo "--- PROCESS LIST ---"
ps aux || true

echo "--- PIDS for relevant processes ---"
pgrep -a node || true
pgrep -a esbuild || true
pgrep -a tsx || true

echo "--- VERSIONS ---"
node -v || true
npm -v || true
if [ -f ./node_modules/tsx/package.json ]; then
  awk -F '"' '/"version"/ {print $4; exit}' ./node_modules/tsx/package.json || true
else
  echo "tsx package.json not found"
fi
if [ -f ./node_modules/esbuild/package.json ]; then
  awk -F '"' '/"version"/ {print $4; exit}' ./node_modules/esbuild/package.json || true
else
  echo "esbuild package.json not found"
fi

echo "=== DIAG END $(date) ==="
