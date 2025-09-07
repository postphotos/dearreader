#!/bin/bash

echo "Starting DearReader "
echo "==========================================="
set -e

COMMAND=$1

case $COMMAND in
  "js-test")
    echo "Running JavaScript tests..."
    docker-compose --profile dev run --rm js-test
    ;;
  "prod-up")
    echo "Starting PRODUCTION environment..."
    docker-compose down --remove-orphans
    docker-compose --profile prod up --build -d
    echo "Production server started. Tailing logs..."
    docker-compose logs -f server
    ;;
  "stop")
    echo "Stopping all services..."
    docker-compose down --remove-orphans
    ;;
  *)
    echo "Unknown command: $COMMAND"
    echo "Available commands: js-test, prod-up, stop"
    exit 1
    ;;
esac