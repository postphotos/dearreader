#!/bin/bash
# Enhanced test monitor and cleanup script with comprehensive safeguards

set -e

# Configuration
MAX_TEST_TIME=300  # 5 minutes maximum for tests
CLEANUP_INTERVAL=30  # Check for zombie processes every 30 seconds
LOG_FILE="/tmp/test-monitor.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to get all test-related processes
get_test_processes() {
    ps aux | grep -E "(mocha|tsx|esbuild.*service)" | grep -v grep | awk '{print $2}' || true
}

# Function to kill zombie test processes
kill_zombie_processes() {
    local processes
    processes=$(get_test_processes)

    if [ -n "$processes" ]; then
        log "🔍 Found zombie test processes: $processes"
        echo "$processes" | xargs kill -9 2>/dev/null || true
        log "💀 Killed zombie processes"
    fi
}

# Enhanced cleanup function
cleanup() {
    log "🧹 Starting comprehensive cleanup..."

    # Kill test-related processes
    pkill -f "mocha.*test\.ts" 2>/dev/null || true
    pkill -f "esbuild.*service" 2>/dev/null || true
    pkill -f "tsx.*mocha" 2>/dev/null || true
    pkill -f "node.*tsx.*mocha" 2>/dev/null || true

    # Kill any remaining Node.js processes running tests
    ps aux | grep -E "node.*test" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

    # Clean up Docker containers if any are stuck
    if command -v docker >/dev/null 2>&1; then
        docker ps -q --filter "name=reader-js-test" | xargs -r docker kill 2>/dev/null || true
        docker ps -aq --filter "name=reader-js-test" | xargs -r docker rm 2>/dev/null || true
    fi

    log "✅ Cleanup completed"
}

# Function to monitor test execution
monitor_tests() {
    local test_pid=$1
    local start_time
    start_time=$(date +%s)

    while kill -0 "$test_pid" 2>/dev/null; do
        local current_time
        current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        # Check if test has exceeded maximum time
        if [ $elapsed -gt $MAX_TEST_TIME ]; then
            log "⚠️  Tests exceeded maximum time ($MAX_TEST_TIME seconds). Killing..."
            kill -9 "$test_pid" 2>/dev/null || true
            cleanup
            exit 124  # Timeout exit code
        fi

        # Check for zombie processes periodically
        if [ $((elapsed % CLEANUP_INTERVAL)) -eq 0 ]; then
            kill_zombie_processes
        fi

        sleep 5
    done
}

# Trap signals to ensure cleanup
trap cleanup EXIT INT TERM

# Pre-test aggressive cleanup
log "🚀 Starting test execution with monitoring..."
log "🧹 Pre-test cleanup: killing any existing zombies..."
kill_zombie_processes

# Additional aggressive pre-cleanup
pkill -9 -f "mocha" 2>/dev/null || true
pkill -9 -f "tsx" 2>/dev/null || true
pkill -9 -f "esbuild" 2>/dev/null || true
sleep 2

# Change to script directory
cd "$(dirname "$0")"

# Start tests in background and monitor
log "📝 Starting npm test..."
npm test > /tmp/npm-test.log 2>&1 &
TEST_PID=$!

# Monitor the test process
monitor_tests $TEST_PID

# Wait for test completion
wait $TEST_PID
TEST_EXIT_CODE=$?

# Post-test cleanup
log "🧹 Post-test cleanup: ensuring no zombies remain..."
kill_zombie_processes
pkill -9 -f "mocha" 2>/dev/null || true
pkill -9 -f "tsx" 2>/dev/null || true
pkill -9 -f "esbuild" 2>/dev/null || true

if [ $TEST_EXIT_CODE -eq 0 ]; then
    log "✅ Tests completed successfully"
else
    log "❌ Tests failed with exit code: $TEST_EXIT_CODE"
fi

# Final cleanup attempt
sleep 1
kill_zombie_processes

exit $TEST_EXIT_CODE
