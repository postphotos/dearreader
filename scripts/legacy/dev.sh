#!/bin/bash

echo "⚠️  DEPRECATED: This script has been replaced by the unified CLI"
echo "========================================================"
echo ""
echo "Please use the new unified CLI instead:"
echo "  ./dearreader dev"
echo ""
echo "For migration help:"
echo "  ./dearreader help"
echo "  cat docs/migration.md"
echo ""
echo "Continuing with old script for backwards compatibility..."
echo ""

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