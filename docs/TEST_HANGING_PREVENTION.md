# Test Hanging Prevention System

This document describes the comprehensive system implemented to prevent test hanging issues in the DearReader project.

## Problem Summary

Previously, tests would hang due to:
1. **Uncleaned interval timers** in PuppeteerControl
2. **ESBuild service processes** from `tsx` runtime not terminating
3. **Zombie test processes** accumulating over time
4. **Resource leaks** in Docker containers

## Prevention System

### 1. Enhanced Resource Management (`src/services/puppeteer.ts`)

- **Multiple interval tracking**: `__healthCheckInterval`, `__cleanupInterval`, `__emergencyCleanupInterval`, `__resourceMonitorInterval`
- **Comprehensive cleanup**: Clears all timers, pages, contexts, and pending requests
- **Emergency cleanup**: Automatic shutdown after 10 minutes in test environments
- **Resource monitoring**: Tracks page counts and request queues for leak detection
- **Graceful shutdown**: `isClosing` flag prevents new operations during shutdown

### 2. Test Environment Monitoring (`test/setup.ts`)

- **Process monitoring**: Tracks active handles and requests during tests
- **Forced exit mechanism**: 500ms timeout with aggressive cleanup
- **ESBuild process killing**: Automatically kills hanging ESBuild services
- **Resource warnings**: Alerts when handle/request counts get too high

### 3. Test Execution Scripts

#### `test-monitor.sh` (Enhanced)
- **5-minute maximum test time** with automatic termination
- **Continuous monitoring** of test processes every 30 seconds
- **Zombie process detection** and cleanup
- **Docker container cleanup** for stuck containers
- **Comprehensive logging** to `/tmp/test-monitor.log`

#### `health-check.sh` (New)
- **System health verification** before and after tests
- **Zombie process detection** (threshold: >5 processes)
- **Container leak detection** (stuck Docker containers)
- **Memory usage monitoring** (threshold: >50% by Node.js processes)
- **Emergency cleanup mode** for manual intervention

### 4. Git Integration

#### Pre-commit Hook (`.git/hooks/pre-commit`)
- **Automatic health check** before every commit
- **Cleanup trigger** if issues detected
- **Commit blocking** until system is healthy

### 5. Package.json Scripts

```json
{
  "test": "standard test command",
  "test:safe": "./test-monitor.sh",     // Use enhanced monitoring
  "test:health": "./health-check.sh check",  // Check system health
  "test:cleanup": "./health-check.sh cleanup" // Emergency cleanup
}
```

### 6. Docker Configuration

- **Enhanced script execution**: Uses `test-monitor.sh` instead of direct npm test
- **Proper environment variables**: `NODE_ENV=test`, `CI=true`
- **Automatic cleanup**: Container cleanup on exit

## Usage

### Running Tests Safely
```bash
# Recommended: Use monitored test execution
npm run test:safe

# Or through unified command system
./run.sh test js

# Check system health
npm run test:health

# Emergency cleanup if needed
npm run test:cleanup
```

### Monitoring Commands
```bash
# Check for zombie processes
./js/health-check.sh check

# View detailed logs
tail -f /tmp/test-monitor.log

# Manual cleanup
./js/health-check.sh cleanup
```

## Prevention Guarantees

1. **Maximum test time**: Tests are killed after 5 minutes
2. **Resource monitoring**: Continuous tracking of handles, requests, and processes
3. **Automatic cleanup**: Multiple cleanup mechanisms at different levels
4. **Pre-commit protection**: Git hooks prevent commits when system is unhealthy
5. **Container isolation**: Docker containers are automatically cleaned up
6. **Process monitoring**: Real-time detection of zombie processes

## Monitoring Thresholds

- **Test execution time**: 300 seconds (5 minutes)
- **Zombie processes**: 5 processes trigger warning
- **Node.js memory usage**: 50% threshold
- **Active handles**: 50 handles trigger warning
- **Active requests**: 20 requests trigger warning
- **Page pool size**: 20 pages trigger cleanup, 50 pages trigger warning

## Recovery Procedures

If tests still hang despite these safeguards:

1. **Check health**: `npm run test:health`
2. **Emergency cleanup**: `npm run test:cleanup`
3. **Review logs**: `tail -f /tmp/test-monitor.log`
4. **Manual process cleanup**: `pkill -f "mocha\|tsx\|esbuild"`
5. **Docker cleanup**: `docker system prune -f`

## Future Improvements

- **Metrics collection**: Add Prometheus metrics for test performance
- **Alert system**: Integrate with monitoring tools for production
- **Resource usage graphs**: Visualize resource consumption over time
- **Automated recovery**: Self-healing mechanisms for common issues
