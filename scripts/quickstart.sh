#!/bin/bash

# Quick Start Script for DearReader
# Gets you up and running in under 2 minutes

set -e

echo "🚀 DearReader Quick Start"
echo "========================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root directory
cd "$PROJECT_ROOT"

echo "📂 Working directory: $(pwd)"

# Check if running on supported OS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "❌ Native Windows detected. Please use WSL2 or follow manual setup instructions."
    echo ""
    echo "🪟 Windows Setup Options:"
    echo "   1. WSL2 (Recommended): https://docs.microsoft.com/en-us/windows/wsl/install"
    echo "   2. Manual setup: ./dearreader setup"
    echo "   3. Docker Desktop: https://www.docker.com/products/docker-desktop"
    echo ""
    echo "📚 After WSL2 setup, run this script from within WSL2."
    exit 1
fi

echo "🔍 Checking system requirements..."

# Check for essential tools
for tool in curl docker docker-compose; do
    if ! command -v $tool >/dev/null 2>&1; then
        echo "❌ $tool is not installed. Please install it first."
        case $tool in
            docker)
                echo "   macOS: https://docs.docker.com/desktop/mac/install/"
                echo "   Linux: https://docs.docker.com/engine/install/"
                ;;
            docker-compose)
                echo "   Usually comes with Docker Desktop"
                ;;
            curl)
                echo "   macOS: brew install curl"
                echo "   Linux: apt-get install curl"
                ;;
        esac
        exit 1
    fi
done

echo "✅ System requirements met"

# Check if already set up
if [ -f "./dearreader" ] && [ -d "./js/node_modules" ] && [ -d "./.venv" ]; then
    echo "✅ DearReader appears to be already set up!"
    echo "   Starting development environment..."
    echo ""
    ./dearreader dev
    exit 0
fi

echo "📦 Setting up DearReader..."
if ! ./dearreader setup; then
    echo ""
    echo "❌ Setup failed. Common solutions:"
    echo "   1. Make sure Docker is running: docker version"
    echo "   2. Try again: ./scripts/quickstart.sh"
    echo "   3. Manual setup: ./dearreader setup --verbose"
    echo "   4. Check logs: ./dearreader logs"
    exit 1
fi

echo ""
echo "🚀 Starting development environment..."
if ! ./dearreader dev; then
    echo ""
    echo "❌ Failed to start development environment."
    echo "   Try: ./dearreader dev --verbose"
    exit 1
fi
