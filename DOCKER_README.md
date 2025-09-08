# Docker Development Setup for DearReader

This document describes the simplified Docker-based setup for the DearReader project.

## Overview

The Docker setup provides a consistent development and testing environment using three core scripts in the project root:
- `setup.sh`: Builds your Docker images.
- `dev.sh`: Starts the development services (JS + Python).
- `run.sh`: Runs specific tasks, like testing or production simulation.

All containers are prefixed with `reader-` for easy identification.

## Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose v2.0+

## Quick Start

### 1. First-Time Setup
Build the necessary Docker images. You only need to do this once, or after changing Dockerfiles or dependencies (`package.json`, `requirements.txt`).

```bash
./setup.sh
```

### 2. Start Development Environment
This command stops any old containers and starts the JavaScript and Python services with hot-reloading.

```bash
./dev.sh
```

### 3. Run Tests
Execute the JavaScript test suite in an isolated container.

```bash
./run.sh js-test
```

### 4. Production Simulation
Test your production build locally.

```bash
./run.sh prod-up
```

### 5. Stop Environment
Shut down all running services.

```bash
./run.sh stop
```

## Architecture

### Services
- **js-functions**: The Node.js Firebase Functions service with Puppeteer support.
- **python**: The Python backend service (Flask app serving config).
- **js-test**: A dedicated service for running JS tests in isolation.
- **server**: Production-optimized multi-service container.

### Dockerfiles
- `docker/Dockerfile`: Unified multi-stage Dockerfile supporting both development targets (dev/test) and a production target. Use `--target` to select the appropriate stage when building.

### Docker Compose Profiles
- **dev**: Development services with hot-reloading (`js-functions`, `python`, `js-test`).
- **prod**: Production service using the optimized production Dockerfile.

## File Structure
```
.
├── Dockerfile                  # (Not used - production is in docker/)
├── docker-compose.yml          # Unified dev & prod with profiles
├── setup.sh                    # Build script
├── dev.sh                      # Dev environment script
├── run.sh                      # Task runner (test, prod-up, stop)
├── docker/
│   └── Dockerfile              # Unified multi-stage Dockerfile (dev & prod targets)
├── js/
│   └── functions/              # JS source code
└── py/
    # (Python dev is provided as a build target in docker/Dockerfile)
    └── requirements.txt
```

## Container Names
All containers use the `reader-` prefix:
- `reader-js-functions`: Development JS service
- `reader-python-dev`: Development Python service  
- `reader-js-test-runner`: Test runner service
- `reader-server-prod`: Production server

## Environment Variables
- `NODE_ENV`: Set to `development` for dev services, `production` for prod
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: Uses system Chromium in containers
- `PUPPETEER_EXECUTABLE_PATH`: Points to `/usr/bin/chromium` in containers

## Development Workflow
1. Run `./setup.sh` once to build images
2. Use `./dev.sh` to start development environment
3. Code changes in `./js` and `./py` are automatically reflected (hot-reload)
4. Test with `./run.sh js-test`
5. Stop with `./run.sh stop`

## Production Deployment
The production image is built from `docker/Dockerfile` and combines both JS and Python services into a single optimized container. For real production, you may want to run services in separate containers using the `prod` profile or a separate production compose file.