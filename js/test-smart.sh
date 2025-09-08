#!/bin/bash
# Smart test runner - kills processes only after tests complete or timeout

set -e

echo "🎯 Starting smart test run with precise cleanup timing..."

# Function to kill all test processes
kill_test_processes() {
    echo "💀 Killing all test processes..."
    pkill -9 -f "mocha" 2>/dev/null || true
    pkill -9 -f "tsx" 2>/dev/null || true
    pkill -9 -f "esbuild" 2>/dev/null || true
    pkill -9 -f "chromium" 2>/dev/null || true
    pkill -9 -f "node.*test" 2>/dev/null || true
}

# Ensure cleanup runs on any exit (capture exit code and run cleanup)
trap 'rc=$?; echo "🧹 Post-test cleanup (tests completed with exit code $rc)..."; kill_test_processes' EXIT

# Pre-cleanup only if truly stuck
echo "🧹 Pre-cleanup: removing any truly stuck processes..."
stuck_processes=$(ps aux | grep -E "(mocha|tsx|esbuild)" | grep -v grep | wc -l)
if [ "$stuck_processes" -gt 5 ]; then
    echo "⚠️  Found $stuck_processes potentially stuck processes, cleaning..."
    kill_test_processes
    sleep 2
fi

# Change to script directory (robust for sourced scripts too)
cd "$(dirname "${BASH_SOURCE[0]}")"

# Set environment variable to prevent forced exit in setup
export SMART_TEST_CLEANUP=true

# Start tests with longer timeout but better monitoring
echo "📝 Starting npm test with 90s timeout..."

# Temporarily disable errexit so we can capture the test exit code and still run cleanup
set +e
timeout 90s npm test
TEST_EXIT_CODE=$?
set -e

echo "✅ Test run completed with exit code: $TEST_EXIT_CODE"

# Exit with the test exit code (trap will run before the shell exits)
exit $TEST_EXIT_CODE
