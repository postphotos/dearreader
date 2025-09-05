#!/bin/bash

echo "🚀 Setting up Reader Demo Environment"
echo "======================================"

# Install dependencies using uv
echo "📥 Installing dependencies with uv..."
uv pip install requests

echo "✅ Setup complete!"
echo ""
echo "🎯 To run the demo:"
echo "1. Make sure Docker container is running:"
echo "   docker run -p 3000:3000 -v ./storage:/app/local-storage reader-app"
echo ""
echo "2. Run the demo script:"
echo "   uv run demo.py"
echo ""
echo "📚 The demo will test Wikipedia pages and show all API formats"
