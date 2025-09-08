# Troubleshooting Guide

This guide helps you resolve common issues when setting up DearReader.

## Quick Diagnosis

Run the verification script first:
```bash
./scripts/verify.sh
```

## Common Issues

### ❌ "docker command not found"
**Solution:**
- **macOS**: Install Docker Desktop from https://docs.docker.com/desktop/mac/install/
- **Linux**: `sudo apt update && sudo apt install docker.io docker-compose`
- **Start Docker** after installation

### ❌ "docker daemon not running"
**Solution:**
- **macOS**: Open Docker Desktop application
- **Linux**: `sudo systemctl start docker`

### ❌ "Node.js is not installed"
**Solution:**
- **macOS**: `brew install node`
- **Linux**: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`

### ❌ "No internet connection"
**Solution:**
- Check your network connection
- Try: `ping google.com`
- If using VPN/proxy, configure Docker accordingly

### ❌ "Insufficient disk space"
**Solution:**
- Need at least 2GB free space
- Clean up: `docker system prune -a`
- Check space: `df -h`

### ❌ "Permission denied" (Linux)
**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again, or:
newgrp docker
```

## Testing Your Setup

### 1. Check System Status
```bash
# Check if Docker is running
docker version

# Check if Node.js is available
cd js && npm --version

# Check if Python is available
cd py && python --version
```

### 2. Test API Endpoints
```bash
# Test basic endpoint
curl "http://localhost:3001/https://www.ala.org"

# Test JSON endpoint
curl -H "Accept: application/json" "http://localhost:3001/https://www.ala.org"
```

### 3. View Logs
```bash
# Check Node.js application logs (if running)
cd js && npm run serve 2>&1 | tee logs/app.log

# Check Docker logs (if using Docker)
docker-compose logs -f
```

## Advanced Troubleshooting

### Reset Everything
```bash
# Stop any running processes
pkill -f "node.*serve" || true
pkill -f "python.*app.py" || true

# Clean up Docker containers (if any)
docker-compose down --remove-orphans || true
docker system prune -f || true

# Clean up Node.js artifacts
cd js && rm -rf node_modules package-lock.json build/

# Clean up Python artifacts
cd py && rm -rf .venv __pycache__/

# Clean up storage and logs
rm -rf storage/* logs/*

# Start fresh
./scripts/quickstart.sh
```

### Check Docker Resources
```bash
# Check Docker disk usage
docker system df

# Clean up Docker
docker system prune -f
docker volume prune -f
```

### Manual Commands
```bash
# Check Docker version
docker --version
docker-compose --version

# Test Docker connectivity
docker run hello-world

# Check Node.js setup
cd js && npm install && npm run build

# Check Python setup
cd py && python -m pip install -r requirements.txt
```

## Getting Help

If you're still having issues:

1. **Check the logs**: `./dearreader logs`
2. **Run with verbose output**: `./dearreader setup --verbose`
3. **Check system resources**: `top` or `htop`
4. **Verify network**: `curl -I https://www.ala.org`

## Platform-Specific Notes

### macOS
- Docker Desktop includes docker-compose
- May need to increase memory allocation in Docker Desktop
- Check System Preferences > Security & Privacy for Docker permissions

### Linux
- Use `sudo` for Docker commands if not in docker group
- Consider using Docker without sudo: https://docs.docker.com/engine/install/linux-postinstall/
- Check firewall settings if containers can't access internet

### WSL (Windows)
- Use Docker Desktop for Windows with WSL2 backend
- Ensure WSL2 is enabled: `wsl --set-default-version 2`
- Check WSL version: `wsl -l -v`
