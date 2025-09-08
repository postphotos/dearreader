#!/bin/bash

# DearReader Setup Verification Script
# Checks if your system is ready for DearReader installation

set -e

echo "🔍 DearReader System Verification"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_tool() {
    local tool=$1
    local description=$2
    local install_url=$3

    echo -n "Checking $tool... "
    if command -v $tool >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Found${NC}"
        if [ "$tool" = "node" ]; then
            local version=$(node --version | sed 's/v//')
            echo "  Version: $version"
            if [[ "$(printf '%s\n' "$version" "18.0.0" | sort -V | head -n1)" != "18.0.0" ]]; then
                echo -e "  ${YELLOW}⚠️  Warning: Node.js 18+ recommended${NC}"
            fi
        fi
        return 0
    else
        echo -e "${RED}❌ Missing${NC}"
        echo "  $description"
        echo "  Install: $install_url"
        return 1
    fi
}

echo "📋 Required Tools:"
echo ""

# Check essential tools
missing_tools=0

if ! check_tool "docker" "Container runtime for services" "https://docs.docker.com/get-docker/"; then
    ((missing_tools++))
fi

if ! check_tool "docker-compose" "Container orchestration" "Usually included with Docker Desktop"; then
    ((missing_tools++))
fi

if ! check_tool "node" "JavaScript runtime" "https://nodejs.org/"; then
    ((missing_tools++))
fi

if ! check_tool "npm" "Node.js package manager" "Usually included with Node.js"; then
    ((missing_tools++))
fi

if ! check_tool "curl" "HTTP client for downloads" "macOS: brew install curl | Linux: apt install curl"; then
    ((missing_tools++))
fi

echo ""
echo "📋 Optional Tools:"
echo ""

# Check optional tools (don't count as missing for setup)
check_tool "uv" "Fast Python package manager" "https://github.com/astral-sh/uv" || true
check_tool "git" "Version control" "https://git-scm.com/" || true

echo ""
echo "🌐 Network Check:"
echo -n "Testing internet connectivity... "
# Try multiple methods to check connectivity (cloud-friendly)
if curl -s --connect-timeout 5 --max-time 10 https://www.google.com >/dev/null 2>&1 || \
   curl -s --connect-timeout 5 --max-time 10 https://www.cloudflare.com >/dev/null 2>&1 || \
   ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ No internet${NC}"
    echo "  Please check your network connection"
    echo "  Note: Some cloud environments block ICMP ping but allow HTTP"
    ((missing_tools++))
fi

echo ""
echo "💾 Disk Space Check:"
if [[ "$OSTYPE" != "msys" && "$OSTYPE" != "win32" ]]; then
    echo -n "Checking available space... "
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        available_space=$(df -g . | tail -1 | awk '{print $4}')
    else
        # Linux
        available_space=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G.*//')
    fi

    if [ "$available_space" -gt 2 ]; then
        echo -e "${GREEN}✅ ${available_space}GB available${NC}"
    else
        echo -e "${RED}❌ Only ${available_space}GB available${NC}"
        echo "  Need at least 2GB free space"
        ((missing_tools++))
    fi
else
    echo -e "${YELLOW}⚠️  Windows detected - please ensure sufficient disk space${NC}"
fi

echo ""
if [ $missing_tools -eq 0 ]; then
    echo -e "${GREEN}🎉 Your system is ready for DearReader!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. ./scripts/quickstart.sh    # Quick setup"
    echo "  2. ./dearreader setup         # Manual setup"
    echo "  3. ./dearreader dev          # Start development"
else
    echo -e "${RED}❌ System needs setup${NC}"
    echo ""
    echo "Please install missing tools and run this script again."
    exit 1
fi
