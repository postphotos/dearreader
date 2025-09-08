#!/bin/bash
# Test runner wrapper that ensures proper cleanup

set -e

# Function to cleanup background processes
cleanup() {
    echo "🧹 Cleaning up test processes..."

    # Kill any hanging mocha processes
    pkill -f "mocha.*test\.ts" 2>/dev/null || true

    # Kill any hanging esbuild service processes
    pkill -f "esbuild.*service" 2>/dev/null || true

    # Kill any hanging tsx processes
    pkill -f "tsx.*mocha" 2>/dev/null || true

    echo "✅ Cleanup completed"
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Run the actual test command
echo "🚀 Starting tests..."
cd "$(dirname "$0")"

# Run tests with a timeout
timeout 120 npm test || {
    exit_code=$?
    echo "⚠️  Tests timed out or failed with exit code: $exit_code"
    exit $exit_code
}

echo "✅ Tests completed successfully"
