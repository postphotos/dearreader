# Setup Guide

## 🚀 Quick Setup

### Prerequisites

**System Requirements:**
- Docker Desktop (with WSL2 support on Windows)
- Node.js 16+ (Linux native)
- Python 3.11+
- uv package installer

### 1. Clone Repository
```bash
git clone https://github.com/postphotos/reader.git
cd reader
```

### 2. One-Command Setup
```bash
./run.sh setup --verbose
```

This unified command will:
- ✅ Check Docker availability
- ✅ Build Docker images
- ✅ Create necessary directories
- ✅ Set up Python virtual environment with uv
- ✅ Install all Python and Node.js dependencies
- ✅ Configure default settings

### 3. Start Development Environment
```bash
./run.sh dev
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

### Environment Variables

Create `.env` file in root directory:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

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
./run.sh test js        # JavaScript tests
./run.sh test python    # Python tests
./run.sh test all       # All tests

# With verbose output
./run.sh test all --verbose

# Continue on failures
./run.sh test all --verbose --force
```

### API Endpoints Test

```bash
# Basic content extraction
curl "http://localhost:3001/https://www.ala.org"

# JSON response
curl -H "Accept: application/json" "http://localhost:3001/https://worldliteracyfoundation.org"

# Screenshot request
curl -H "X-Respond-With: screenshot" "http://localhost:3001/https://en.wikipedia.org/wiki/Reading"

# Queue status
curl "http://localhost:3001/queue/stats"
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
