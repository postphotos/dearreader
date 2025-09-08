#!/bin/bash
# Aggressive test runner with immediate zombie killing

set -e

echo "🔥 Starting aggressive test run with immediate cleanup..."

# Function to kill all test processes
kill_test_processes() {
    echo "💀 Killing all test processes..."
    pkill -9 -f "mocha" 2>/dev/null || true
    pkill -9 -f "tsx" 2>/dev/null || true
    pkill -9 -f "esbuild" 2>/dev/null || true
    pkill -9 -f "chromium" 2>/dev/null || true
    pkill -9 -f "node.*test" 2>/dev/null || true
}

# Pre-cleanup
kill_test_processes
sleep 1

# Change to script directory
cd "$(dirname "$0")"

# Start tests with timeout
echo "📝 Starting npm test with 60s timeout..."
timeout 60s npm test &
TEST_PID=$!

# Monitor and kill if needed
(
    sleep 60
    if kill -0 $TEST_PID 2>/dev/null; then
        echo "⚠️  Test timeout reached, killing processes..."
        kill -9 $TEST_PID 2>/dev/null || true
        kill_test_processes
    fi
) &
MONITOR_PID=$!

# Wait for test completion
wait $TEST_PID 2>/dev/null
TEST_EXIT_CODE=$?

# Kill monitor
kill $MONITOR_PID 2>/dev/null || true

# Post-cleanup
echo "🧹 Post-test cleanup..."
kill_test_processes

echo "✅ Test run completed with exit code: $TEST_EXIT_CODE"
exit $TEST_EXIT_CODE
