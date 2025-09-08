#!/bin/bash

# Quick Start Script for DearReader
# Gets you up and running in under 2 minutes

set -e

echo "🚀 DearReader Quick Start"
echo "========================="
echo ""

# Check if already set up
if [ -f "./dearreader" ] && [ -d "./js/node_modules" ] && [ -d "./.venv" ]; then
    echo "✅ DearReader appears to be already set up!"
    echo "   Starting development environment..."
    echo ""
    ./dearreader dev
    exit 0
fi

echo "📦 Setting up DearReader..."
./dearreader setup

echo ""
echo "🚀 Starting development environment..."
./dearreader dev
