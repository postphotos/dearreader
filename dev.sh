#!/bin/bash
set -e

echo "Starting DearReader Development Environment"
echo "==========================================="

# Stop any running services and start the development environment
echo "Tearing down any existing 'reader' environment..."
docker-compose down --remove-orphans

echo "Starting DEVELOPMENT environment (JS + Python)..."
docker-compose --profile dev up --build -d

echo "Services started. Tailing logs (Ctrl+C to exit)..."
docker-compose logs -f js-functions python