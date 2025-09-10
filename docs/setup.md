# Setup Guide

## 🚀 Quick Setup

### Prerequisites

**System Requirements:**
- Docker Desktop (with WSL2 support on Windows)
- Node.js 16+ (Lin### Directory Structure

Post-setup directory layout:
```
dearreader/
├── docs/               # Documentation (current)
├── storage/            # Data persistence
├── logs/               # Application logs (created on first run)
├── js/                 # Node.js/TypeScript application
│   ├── src/            # Source code
│   ├── public/         # Web assets
│   ├── build/          # Compiled output
│   └── package.json    # Dependencies
├── py/                 # Python utilities
│   ├── app.py          # Main runner script
│   ├── demo.py         # Demo script
│   ├── speedtest.py    # Performance tests
│   └── requirements.txt # Python dependencies
├── docker/             # Docker configuration
└── config.yaml        # Application config
```Python 3.11+
- uv package installer

### Installing Tesseract OCR

Tesseract OCR is required for PDF text extraction and OCR functionality in the JavaScript tests.

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-eng
```

**CentOS/RHEL:**
```bash
sudo yum install -y tesseract
```

**Fedora:**
```bash
sudo dnf install -y tesseract
```

**Arch Linux:**
```bash
sudo pacman -S --noconfirm tesseract tesseract-data-eng
```

**macOS (with Homebrew):**
```bash
brew install tesseract tesseract-lang
```

**Windows:**
Download from: https://github.com/UB-Mannheim/tesseract/wiki
Add to PATH: `C:\Program Files\Tesseract-OCR`

**Note:** The setup scripts will attempt to install Tesseract automatically on supported systems.

### 1. Clone Repository
```bash
git clone https://github.com/postphotos/dearreader.git
cd dearreader
```

### 2. One-Command Setup
```bash
./scripts/quickstart.sh
```

This script will:
- ✅ Check Docker availability
- ✅ Build Docker images
- ✅ Create necessary directories
- ✅ Set up Python virtual environment with uv
- ✅ Install all Python and Node.js dependencies
- ✅ Configure default settings

### 3. Start Development Environment
```bash
./scripts/quickstart.sh
```

Or for manual control:
```bash
# Build and start the backend
cd js && npm run build:watch &
cd js && npm run serve &
```

### 4. Verify Installation
Open **http://localhost:3001** in your browser to see the dashboard.

## 🪟 Windows Setup

### WSL2 (Recommended)

**1. Install WSL2:**
```powershell
# Open PowerShell as Administrator
wsl --install
wsl --set-default-version 2
```

**2. Install Ubuntu (or your preferred distro):**
```powershell
wsl --install -d Ubuntu
```

**3. Set up DearReader in WSL2:**
```bash
# In WSL2 terminal
git clone https://github.com/postphotos/reader.git
cd reader
./scripts/quickstart.sh
```

### Native Windows (Alternative)

**Requirements:**
- Windows 10/11 Pro or Enterprise
- Docker Desktop with WSL2 backend
- Git Bash or Windows Terminal

**Setup Steps:**
```bash
# Use Git Bash or Windows Terminal
git clone https://github.com/postphotos/reader.git
cd reader

# Manual setup (quickstart.sh doesn't support native Windows)
./dearreader setup
./dearreader dev
```

**Known Limitations:**
- Some utility scripts may not work in native Windows
- Use WSL2 for full compatibility

## 🏗️ Installation Details

### Docker Configuration

**Required Images:**
```yaml
# docker-compose.yml
services:
  js-server:       # Node.js crawler service
  python:          # Python data processing
  js-test:         # JavaScript test runner
```

**Build Commands:**
```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build js-functions
```

### Python Environment Setup

```bash
# Using uv (recommended)
uv venv --clear
source .venv/bin/activate  # Unix/Linux
source .venv/Scripts/activate  # Windows

# Install dependencies
uv pip install -r py/requirements.txt
```

### Node.js Dependencies

```bash
# Install Node.js packages
npm install --prefix js/
```

## 🔧 Configuration

### AI Provider Configuration

DearReader supports multiple AI providers for text processing and parsing:

```yaml
# config.yaml
ai_providers:
  openai:
    api_key: "your-openai-api-key"
    base_url: "https://api.openai.com/v1"
    model: "gpt-3.5-turbo"
    temperature: 0.2
    parsing_prompt: "Extract structured data from the following text:"
    prompt_options:
      max_tokens: 2048
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2
  openrouter:
    api_key: "your-openrouter-api-key"
    base_url: "https://openrouter.ai/api/v1"
    model: "openrouter/gpt-4"
    temperature: 0.2
    parsing_prompt: "Extract structured data from the following text:"
    prompt_options:
      max_tokens: 2048
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2
  gemini:
    api_key: "your-gemini-api-key"
    base_url: "https://generativelanguage.googleapis.com/v1"
    model: "gemini-pro"
    temperature: 0.2
    parsing_prompt: "Extract structured data from the following text:"
    prompt_options:
      max_tokens: 2048
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2
```

### Environment Variables

You can also configure AI providers using environment variables:

```bash
# OpenAI
export OPENAI_API_KEY="your-openai-api-key"
export OPENAI_MODEL="gpt-4"
export OPENAI_TEMPERATURE="0.3"

# OpenRouter
export OPENROUTER_API_KEY="your-openrouter-api-key"
export OPENROUTER_MODEL="openrouter/gpt-4"

# Gemini
export GEMINI_API_KEY="your-gemini-api-key"
export GEMINI_MODEL="gemini-pro"
```

### Environment Variables

Create `.env` file in root directory:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# AI Providers (alternative to config.yaml)
OPENAI_API_KEY=your_openai_key
OPENROUTER_API_KEY=your_openrouter_key
GEMINI_API_KEY=your_gemini_key

# Database (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/reader

# Performance Settings
MAX_CONCURRENT_REQUESTS=10
TIMEOUT_SECONDS=30
```

### Directory Structure

Post-setup directory layout:
```
reader/
├── docs/               # Documentation (new)
├── storage/            # Data persistence
├── logs/               # Application logs
├── temp/               # Temporary files
├── js/                 # Frontend/React app
├── py/                 # Python backend services
├── docker/             # Container configurations
└── screenshots/        # Captured images
```

## 🧪 Testing Installation

### Manual Tests

```bash
# Test individual components
cd js && npm test

# Test Python components
cd py && python demo.py

# Test API endpoints manually
curl "http://localhost:3001/https://www.ala.org"
```

### API Endpoints Test

```bash
# Basic content extraction (Markdown)
curl "http://localhost:3001/https://www.ala.org"

# JSON response with metadata
curl -H "Accept: application/json" "http://localhost:3001/https://worldliteracyfoundation.org"

# Or use the dedicated JSON path
curl "http://localhost:3001/json/https://worldliteracyfoundation.org"

# Screenshot request
curl -H "X-Respond-With: screenshot" "http://localhost:3001/https://en.wikipedia.org/wiki/Reading"

# Queue status
curl "http://localhost:3001/queue"
```

### Web Interface Test

1. **Main Dashboard**: http://localhost:3001
2. **Queue Monitor**: http://localhost:3001/queue-ui
3. **API Documentation**: http://localhost:3001/api.html

## 🐛 Troubleshooting

### Common Issues

**Docker not running:**
```bash
# Check status
docker version
docker-compose version

# Start Docker Desktop (Windows/Linux)
# Ensure Docker daemon is running
```

**Permission errors:**
```bash
# Fix directory permissions
chmod +x run.sh setup.sh
chmod -R 755 js/ py/
```

**Port conflicts:**
```bash
# Check what's using port 3001
lsof -i :3001

# Use alternative port
PORT=3001 ./run.sh dev
```

**Package installation fails:**
```bash
# Clear cache and reinstall
rm -rf js/node_modules package-lock.json
rm -rf .venv
./run.sh setup
```

### Debug Mode

```bash
# Docker logs
docker-compose logs -f js-functions python

# Local logs
tail -f logs/application.log

# Network debugging
docker-compose ps
```

## 📝 Next Steps

After successful setup:

1. **Explore Web Interface**: http://localhost:3001
2. **Try API Examples**: See API Reference
3. **Review Configuration**: Customize settings
4. **Read Full Documentation**: Complete user guides

<!-- 🍎 Educational Note: This setup enables digital content accessibility, supporting literacy initiatives by providing easy-to-process web content for educational tools. -->
