# test.sh - Full End-to-End Test Cycle

This script performs a comprehensive end-to-end test cycle for the Reader project.

## What it does:

1. **npm Tests**: Runs the test suite in `backend/functions/`
2. **Docker Build**: Builds the Docker image using docker-compose
3. **Docker Run**: Starts the container and waits for the service to be ready
4. **Pyright Type Check**: Installs and runs pyright type checker on `demo.py`
5. **Run Demo**: Installs Python dependencies and executes `demo.py`

## Prerequisites:

- Node.js 20
- npm
- Docker & docker-compose
- Python 3 & pip3
- curl (for health checks)

## Usage:

```bash
./test.sh
```

## What gets tested:

- ✅ TypeScript compilation
- ✅ Unit tests
- ✅ Docker container build
- ✅ Service startup and health
- ✅ Python type checking
- ✅ Demo script execution

## Exit Codes:

- `0`: All tests passed successfully
- `1`: One or more tests failed

## Cleanup:

The script automatically cleans up Docker containers on exit (success or failure).
