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

# Check for Tesseract OCR (needed for PDF OCR functionality)
echo "🔍 Checking for Tesseract OCR..."
if ! command -v tesseract &> /dev/null; then
    echo "⚠️  Tesseract OCR not found. Installing Tesseract for PDF OCR functionality..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux (Ubuntu/Debian)
        if command -v apt-get &> /dev/null; then
            echo "📦 Installing Tesseract OCR (Ubuntu/Debian)..."
            sudo apt-get update && sudo apt-get install -y tesseract-ocr tesseract-ocr-eng
        elif command -v yum &> /dev/null; then
            echo "📦 Installing Tesseract OCR (CentOS/RHEL)..."
            sudo yum install -y tesseract
        elif command -v dnf &> /dev/null; then
            echo "📦 Installing Tesseract OCR (Fedora)..."
            sudo dnf install -y tesseract
        elif command -v pacman &> /dev/null; then
            echo "📦 Installing Tesseract OCR (Arch Linux)..."
            sudo pacman -S --noconfirm tesseract tesseract-data-eng
        else
            echo "⚠️  Could not determine package manager. Please install Tesseract OCR manually:"
            echo "   Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-eng"
            echo "   CentOS/RHEL: sudo yum install tesseract"
            echo "   Fedora: sudo dnf install tesseract"
            echo "   Arch: sudo pacman -S tesseract tesseract-data-eng"
            echo "   macOS: brew install tesseract tesseract-lang"
            echo "   Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "📦 Installing Tesseract OCR (macOS)..."
            brew install tesseract tesseract-lang
        else
            echo "⚠️  Homebrew not found. Please install Tesseract OCR manually:"
            echo "   brew install tesseract tesseract-lang"
        fi
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        # Windows
        echo "⚠️  Tesseract OCR installation on Windows requires manual setup:"
        echo "   Download from: https://github.com/UB-Mannheim/tesseract/wiki"
        echo "   Add to PATH: C:\\Program Files\\Tesseract-OCR"
    else
        echo "⚠️  Unsupported OS for automatic Tesseract installation. Please install manually."
    fi
else
    echo "✅ Tesseract OCR is already installed"
fi
