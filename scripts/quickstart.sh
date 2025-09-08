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

# Function to show usage
show_usage() {
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  --help          Show this help message"
    echo "  --docker-only   Skip setup and just start Docker containers"
    echo "  --no-docker     Skip Docker and run locally (requires Node.js)"
    echo ""
    echo "Examples:"
    echo "  $0              # Full setup with Docker (recommended)"
    echo "  $0 --docker-only # Just start existing Docker containers"
    echo "  $0 --no-docker  # Run locally without Docker"
    echo ""
}

# Parse command line arguments
DOCKER_ONLY=false
NO_DOCKER=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_usage
            exit 0
            ;;
        --docker-only)
            DOCKER_ONLY=true
            shift
            ;;
        --no-docker)
            NO_DOCKER=true
            shift
            ;;
        *)
            echo "❌ Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if running on supported OS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    if [ "$NO_DOCKER" = false ]; then
        echo "❌ Native Windows detected. Please use WSL2 or run with --no-docker option."
        echo ""
        echo "🪟 Windows Options:"
        echo "   1. WSL2 (Recommended): https://docs.microsoft.com/en-us/windows/wsl/install"
        echo "   2. Run locally: $0 --no-docker"
        echo "   3. Manual setup: ./dearreader setup"
        echo ""
        echo "📚 After WSL2 setup, run this script from within WSL2."
        exit 1
    fi
fi

echo "🔍 Checking system requirements..."

# Check for essential tools
if [ "$NO_DOCKER" = true ]; then
    # Check for Node.js when running locally
    for tool in node npm; do
        if ! command -v $tool >/dev/null 2>&1; then
            echo "❌ $tool is not installed. Please install Node.js from https://nodejs.org"
            exit 1
        fi
    done
    echo "✅ Node.js environment ready"
else
    # Check for Docker when using containers
    for tool in docker docker-compose; do
        if ! command -v $tool >/dev/null 2>&1; then
            echo "❌ $tool is not installed. Please install Docker Desktop from https://www.docker.com"
            exit 1
        fi
    done
    echo "✅ Docker environment ready"
fi

# Handle Docker-only mode
if [ "$DOCKER_ONLY" = true ]; then
    echo "🐳 Starting existing Docker containers..."
    if ! docker-compose up -d; then
        echo ""
        echo "❌ Failed to start Docker containers."
        echo "   Try rebuilding: docker-compose build --no-cache"
        exit 1
    fi

    echo ""
    echo "✅ Docker containers started!"
    echo "🌐 API available at: http://localhost:3001"
    echo "📊 Check status: ./dearreader status"
    echo "🛑 Stop services: ./dearreader stop"
    exit 0
fi

# Handle no-Docker mode
if [ "$NO_DOCKER" = true ]; then
    echo "🏠 Running locally without Docker..."

    # Check if already set up
    if [ ! -d "js/node_modules" ]; then
        echo "📦 Installing dependencies..."
        cd js
        if ! npm install; then
            echo "❌ Failed to install dependencies"
            exit 1
        fi
        cd ..
    fi

    # Build the project
    echo "🔨 Building project..."
    cd js
    if ! npm run build; then
        echo "❌ Failed to build project"
        exit 1
    fi
    cd ..

    # Start the server
    echo "🚀 Starting server..."
    cd js
    echo "🌐 Server starting on http://localhost:3001"
    echo "🛑 Press Ctrl+C to stop"
    npm run serve
    exit 0
fi

# Full Docker setup (default behavior)
echo "🐳 Setting up DearReader with Docker..."

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
    echo "   5. Run locally: ./scripts/quickstart.sh --no-docker"
    exit 1
fi

echo ""
echo "🚀 Starting development environment..."
if ! ./dearreader dev; then
    echo ""
    echo "❌ Failed to start development environment."
    echo "   Try: ./dearreader dev --verbose"
    echo "   Or run locally: ./scripts/quickstart.sh --no-docker"
    exit 1
fi

echo ""
echo "🎉 DearReader is now running!"
echo "🌐 API available at: http://localhost:3001"
echo "📚 Try it: curl 'http://localhost:3001/https://example.com'"
echo "🛑 Stop services: ./dearreader stop"
