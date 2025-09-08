#!/bin/bash
# Health check script to detect and prevent hanging test processes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_LOG="/tmp/test-health.log"

# Function to log with timestamp
log_health() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$HEALTH_LOG"
}

# Function to check for zombie processes
check_zombies() {
    local zombies
    zombies=$(ps aux | grep -E "(mocha|tsx|esbuild.*service)" | grep -v grep | wc -l)

    if [ "$zombies" -gt 5 ]; then
        log_health "WARNING: $zombies zombie test processes detected"
        return 1
    fi

    return 0
}

# Function to check Docker containers
check_containers() {
    local stuck_containers
    stuck_containers=$(docker ps -q --filter "name=reader-js-test" | wc -l)

    if [ "$stuck_containers" -gt 0 ]; then
        log_health "WARNING: $stuck_containers stuck test containers detected"
        return 1
    fi

    return 0
}

# Function to check system resources
check_resources() {
    local memory_usage
    memory_usage=$(ps aux | grep -E "(node|mocha)" | awk '{sum += $4} END {print sum}' | cut -d. -f1)

    if [ "${memory_usage:-0}" -gt 50 ]; then
        log_health "WARNING: High memory usage by Node.js processes: ${memory_usage}%"
        return 1
    fi

    return 0
}

# Main health check
main() {
    log_health "Starting health check..."

    local issues=0

    check_zombies || issues=$((issues + 1))
    check_containers || issues=$((issues + 1))
    check_resources || issues=$((issues + 1))

    if [ $issues -eq 0 ]; then
        log_health "Health check passed"
        echo "✅ System healthy"
        exit 0
    else
        log_health "Health check failed with $issues issues"
        echo "⚠️  Health check detected $issues issues (see $HEALTH_LOG)"
        exit 1
    fi
}

# Cleanup function if run directly
cleanup_now() {
    echo "🧹 Running emergency cleanup..."

    # Kill zombie processes
    pkill -f "mocha.*test\.ts" 2>/dev/null || true
    pkill -f "esbuild.*service" 2>/dev/null || true
    pkill -f "tsx.*mocha" 2>/dev/null || true

    # Clean up Docker containers
    docker ps -q --filter "name=reader-js-test" | xargs -r docker kill 2>/dev/null || true
    docker ps -aq --filter "name=reader-js-test" | xargs -r docker rm 2>/dev/null || true

    echo "✅ Emergency cleanup completed"
}

# Handle command line arguments
case "${1:-check}" in
    "check")
        main
        ;;
    "cleanup")
        cleanup_now
        ;;
    *)
        echo "Usage: $0 [check|cleanup]"
        echo "  check   - Run health check (default)"
        echo "  cleanup - Run emergency cleanup"
        exit 1
        ;;
esac
