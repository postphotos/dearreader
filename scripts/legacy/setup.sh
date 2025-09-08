#!/usr/bin/env bash

echo "⚠️  DEPRECATED: This script has been replaced by the unified CLI"
echo "========================================================"
echo ""
echo "Please use the new unified CLI instead:"
echo "  ./dearreader setup"
echo ""
echo "For migration help:"
echo "  ./dearreader help"
echo "  cat docs/migration.md"
echo ""
echo "Continuing with old script for backwards compatibility..."
echo ""

echo "🚀 Setting up DearReader Demo Environment"
echo "======================================"

set -e

echo "🚀 Setting up DearReader Docker Environment"
echo "==========================================="

# Check for Docker
if ! command -v docker &> /dev/null
then
    echo "❌ docker could not be found. Please install Docker (https://www.docker.com/get-started)"
    exit 1
fi

if ! command -v docker-compose &> /dev/null
then
    echo "❌ docker-compose could not be found. Please install Docker Compose"
    exit 1
fi

echo "📦 Building Docker images..."
docker-compose build

echo "✅ Setup complete! You can now:"
echo "   - Start development: ./run.sh dev"
echo "   - Run tests: ./run.sh test all"
echo "   - Run JS tests only: ./run.sh test js"
echo "   - Run Python tests only: ./run.sh test python"
echo "   - Start production: ./run.sh run prod"
echo "   - Stop all: ./run.sh stop"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p storage
mkdir -p docker
mkdir -p logs
mkdir -p jsf/node_modules

# Ensure Dockerfile is in docker directory
if [ -f "Dockerfile" ] && [ ! -f "docker/Dockerfile" ]; then
  mv Dockerfile docker/
  echo "📁 Moved Dockerfile to docker/ directory"
fi

# Create default config if needed
if [ ! -f "config.yaml" ]; then
  echo "url: \"http://localhost:3000\"" > config.yaml
  echo "📁 Created default config.yaml"
fi

# Install python dependencies using uv
echo "📥 Creating Python virtual environment..."
if uv venv --clear; then
    echo "✅ Virtual environment created successfully."
else
    echo "❌ Failed to create virtual environment. Please check your uv installation."
    exit 1
fi

# Activate virtual environment (cross-platform)
echo "🔧 Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    if [ -f ".venv/Scripts/activate" ]; then
        source .venv/Scripts/activate
        echo "✅ Virtual environment activated (Windows)."
    else
        echo "❌ Virtual environment activation script not found at .venv/Scripts/activate"
        exit 1
    fi
else
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
        echo "✅ Virtual environment activated (Unix/Linux)."
    else
        echo "❌ Virtual environment activation script not found at .venv/bin/activate"
        exit 1
    fi
fi

echo "📥 Installing Python dependencies with uv..."
if uv pip install -r py/requirements.txt; then
    echo "✅ Python dependencies installed successfully."
else
    echo "❌ Failed to install Python dependencies. Please check your requirements.txt file."
    exit 1
fi

# Install node dependencies
echo "📥 Installing Node.js dependencies..."
if npm install --prefix js/; then
    echo "✅ Setup complete! You can now run the application using ./run.sh"
    echo ""
else
    echo "❌ Failed to install Node.js dependencies. Please check your npm installation."
    exit 1
fi
