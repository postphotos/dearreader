#!/bin/bash
# Nuclear option: Kill ALL test-related processes aggressively

set -e

echo "🔥 NUCLEAR CLEANUP: Killing ALL test-related processes..."

# Kill all Node.js processes that might be tests
pkill -9 -f "node.*test" 2>/dev/null || true
pkill -9 -f "node.*mocha" 2>/dev/null || true
pkill -9 -f "node.*tsx" 2>/dev/null || true

# Kill specific test frameworks
pkill -9 -f "mocha" 2>/dev/null || true
pkill -9 -f "tsx" 2>/dev/null || true
pkill -9 -f "esbuild" 2>/dev/null || true

# Kill any chromium/puppeteer processes
pkill -9 -f "chromium" 2>/dev/null || true
pkill -9 -f "chrome" 2>/dev/null || true

# Kill any remaining npm test processes
ps aux | grep -E "npm.*test" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# Kill Docker containers if running
docker ps -q --filter "name=js-test" | xargs -r docker kill 2>/dev/null || true
docker ps -aq --filter "name=js-test" | xargs -r docker rm -f 2>/dev/null || true

# Wait a moment
sleep 2

# Check if anything is still running
remaining=$(ps aux | grep -E "(mocha|tsx|esbuild.*service)" | grep -v grep | wc -l)
if [ "$remaining" -gt 0 ]; then
    echo "⚠️  Still found $remaining test processes after cleanup"
    ps aux | grep -E "(mocha|tsx|esbuild.*service)" | grep -v grep
else
    echo "✅ All test processes successfully killed"
fi

echo "🔥 Nuclear cleanup completed"
