#!/bin/bash

# Test script for DearReader API endpoints
# Run this after starting the services to verify everything is working

set -e

echo "🧪 Testing DearReader API Endpoints"
echo "==================================="
echo ""

BASE_URL="http://localhost:3001"
TIMEOUT=30

# Function to test an endpoint
test_endpoint() {
    local url="$1"
    local expected_status="${2:-200}"
    local description="$3"

    echo "🔍 Testing: $description"
    echo "   URL: $url"

    if command -v curl >/dev/null 2>&1; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "ERROR: Connection failed")
        http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

        if [[ "$response" == *"ERROR"* ]]; then
            echo "❌ Failed: Connection timeout or server not responding"
            return 1
        elif [ "$http_code" = "$expected_status" ]; then
            echo "✅ Success: HTTP $http_code"
            return 0
        else
            echo "❌ Failed: HTTP $http_code (expected $expected_status)"
            return 1
        fi
    else
        echo "⚠️  curl not available, skipping HTTP tests"
        return 0
    fi
}

# Function to test JSON endpoint specifically
test_json_endpoint() {
    local url="$1"
    local description="$2"

    echo "🔍 Testing JSON: $description"
    echo "   URL: $url"

    if command -v curl >/dev/null 2>&1; then
        response=$(curl -s --max-time $TIMEOUT "$url" 2>/dev/null || echo "ERROR")
        if [[ "$response" == *"ERROR"* ]]; then
            echo "❌ Failed: Connection timeout or server not responding"
            return 1
        elif [[ "$response" == *"{"* ]] && [[ "$response" == *"}"* ]]; then
            echo "✅ Success: Valid JSON response"
            echo "   Response preview: ${response:0:100}..."
            return 0
        else
            echo "❌ Failed: Invalid JSON response"
            echo "   Response: $response"
            return 1
        fi
    else
        echo "⚠️  curl not available, skipping JSON tests"
        return 0
    fi
}

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 5

# Test basic endpoints
echo ""
echo "📋 Testing Basic Endpoints:"
echo ""

test_endpoint "$BASE_URL/" 200 "Root endpoint"
test_endpoint "$BASE_URL/health" 200 "Health check"
test_endpoint "$BASE_URL/status" 200 "Status endpoint"

# Test scraping endpoints
echo ""
echo "🌐 Testing Scraping Endpoints:"
echo ""

test_endpoint "$BASE_URL/https://httpbin.org/html" 200 "HTTP scraping"
test_endpoint "$BASE_URL/https://example.com" 200 "Example.com scraping"
test_json_endpoint "$BASE_URL/json/https://httpbin.org/json" "JSON endpoint"

# Test with a real website
echo ""
echo "📰 Testing Real Website:"
echo ""

test_endpoint "$BASE_URL/https://news.ycombinator.com" 200 "Hacker News"

echo ""
echo "🎉 API Testing Complete!"
echo ""
echo "💡 Tips:"
echo "   • If tests fail, check server logs: ./dearreader logs"
echo "   • Restart services: ./dearreader restart"
echo "   • Stop services: ./dearreader stop"
echo "   • Start fresh: ./scripts/quickstart.sh"