# 🚀 Quick Start Guide

Get DearReader up and running in under 5 minutes!

## Prerequisites

- **Docker Desktop** (with WSL2 on Windows)
- **Git**
- **4GB RAM** minimum

## ⚡ One-Command Setup

```bash
# Clone and setup everything
git clone https://github.com/postphotos/dearreader.git
cd dearreader
./scripts/quickstart.sh
```

That's it! The script will:
- ✅ Check system requirements
- ✅ Build Docker containers
- ✅ Install dependencies
- ✅ Start the development server
- ✅ Open your browser to http://localhost:3001

## 🔐 API Key Setup (Optional)

For AI features, configure your API keys securely:

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your actual API keys (NEVER commit this file!)
nano .env
```

**Example .env file:**
```bash
# OpenAI (for GPT models)
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4

# OpenRouter (for Claude, Gemini, etc.)
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key-here

# Optional: Pinecone for vector storage
PINECONE_API_KEY=your-pinecone-key-here
PINECONE_ENVIRONMENT=your-environment

# Proxy settings (optional)
HTTP_PROXY=http://127.0.0.1:8080
HTTPS_PROXY=http://127.0.0.1:8080
```

**Configuration Structure:**
- `.env` - API keys and secrets (gitignored)
- `config.yaml` - Application settings and AI provider configurations
- `crawl_pipeline.yaml` - LLM processing pipelines and prompts

**Security Notes:**
- 🔒 `.env` files are automatically ignored by git
- 🚫 Never commit real API keys to version control
- ✅ Use `.env.example` as a template
- 🔄 Environment variables override YAML config

## 🧪 Test Your Setup

```bash
# Test the API
curl "http://localhost:3001/api/crawl?url=https://httpbin.org/html"

# Test with JSON response
curl "http://localhost:3001/api/crawl?url=https://httpbin.org/json&format=json"

# Test with AI processing disabled
curl "http://localhost:3001/api/crawl?url=https://httpbin.org/html&ai_enabled=false"
```

## 🎯 Key Features

### Hot Reloading Configuration
Edit `config.yaml` and see changes instantly - no server restart needed!

```yaml
# Enable/disable AI processing
ai_enabled: false

# Configure robots.txt compliance
robots:
  respect_robots_txt: false

# Exclude unwanted file types
content:
  exclude_file_types: ".xml, .rss, .pdf, .jpg, .png"
```

### Multiple File Type Excludes
```bash
# Exclude multiple file types at once
curl "http://localhost:3001/api/crawl?url=https://example.com&exclude_file_types=.pdf,.xml,.jpg,.png,.gif"
```

### On-the-Fly AI Configuration
```bash
# Override AI settings per request
curl "http://localhost:3001/api/crawl?url=https://example.com&ai_enabled=true&model=gpt-4&api_key=your-key"
```

### Custom Headers for Bypass
```bash
# Add custom headers to bypass restrictions
curl "http://localhost:3001/api/crawl?url=https://example.com&custom_headers={\"User-Agent\":\"Custom-Bot\",\"X-Bypass\":\"true\"}"
```

## 📱 Web Interface

Visit **http://localhost:3001** for:
- **Interactive API testing**
- **Queue monitoring**
- **Configuration management**
- **Real-time logs**

## 🛠️ Development Commands

```bash
# View logs
docker-compose logs -f js-server

# Restart services
docker-compose restart js-server

# Run tests
cd js && npm test

# Check health
curl http://localhost:3001/health
```

## 🔧 Configuration Examples

### Basic Setup
```yaml
# config.yaml
url: http://localhost:3001/
ai_enabled: false
robots:
  respect_robots_txt: false
```

### Advanced Configuration
```yaml
# Content filtering
content:
  exclude_file_types: ".xml, .rss, .atom, .json"
  exclude_url_patterns: ".*\\.xml$, .*/api/.*"

# AI providers (optional)
ai_providers:
  openai:
    api_key: "your-key"
    model: "gpt-4"

# Custom headers
headers:
  custom_headers:
    "User-Agent": "DearReader/1.0"
```

## 🐛 Troubleshooting

### Common Issues

**Server not responding?**
```bash
# Check if container is running
docker-compose ps

# View logs
docker-compose logs js-server

# Restart
docker-compose restart js-server
```

**Configuration not loading?**
```bash
# Check config file
cat config.yaml

# Test health endpoint
curl http://localhost:3001/health
```

**Tests failing?**
```bash
# Run health check
./scripts/health-check.sh check

# Clean and restart
./scripts/quickstart.sh
```

## 📚 Next Steps

1. **Explore the Web UI** at http://localhost:3001
2. **Read the full documentation** in `/docs/`
3. **Customize your configuration** in `config.yaml`
4. **Try advanced API features** with custom headers and AI

## 🎉 You're All Set!

DearReader is now running with:
- ✅ Hot-reloadable configuration
- ✅ Multiple file type filtering
- ✅ Optional AI processing
- ✅ Custom header support
- ✅ Comprehensive API
- ✅ Web interface

Happy crawling! 🕷️