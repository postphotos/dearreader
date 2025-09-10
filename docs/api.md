# API Reference

## 🌐 HTTP API

DearReader provides a simple HTTP API for extracting web page content and managing crawler queues. Built on Express.js with TypeScript support.

### Base URL
```
http://localhost:3001
```

### Endpoint: `/[url]`

**Extract content from web pages**

#### URL Pattern
```
/[protocol]://[domain]/[path]?[query]
```

#### Examples

**Basic Usage:**
```bash
# Markdown content (default)
curl "/https://example.com"

# JSON response with metadata
curl -H "Accept: application/json" "/https://github.com/jina-ai/reader"

# Plain text extraction
curl "/https://news.ycombinator.com"

# Screenshot capture (returns image URL to saved screenshot)
curl -H "X-Respond-With: screenshot" "/https://google.com"

# HTML output
curl "/https://httpbin.org/html"
```

**AI Processing Control:**
```bash
# Enable AI processing with custom model
curl "/https://example.com?ai_enabled=true&model=gpt-4"

# Disable AI processing
curl "/https://example.com?ai_enabled=false"

# Custom prompt
curl "/https://example.com?prompt=Extract%20the%20main%20arguments%20from%20this%20article"

# Override API key
curl "/https://example.com?api_key=your-custom-key"
```

## 🔐 API Key Configuration

### Environment Variables (.env files)

For secure API key management, DearReader supports loading configuration from `.env` files:

```bash
# Create .env file from template
cp .env.example .env

# Add your API keys
echo "OPENAI_API_KEY=sk-your-key-here" >> .env
echo "OPENROUTER_API_KEY=sk-or-v1-your-key-here" >> .env
```

**Supported Environment Variables:**
- `OPENAI_API_KEY` - OpenAI API key
- `OPENROUTER_API_KEY` - OpenRouter API key  
- `GEMINI_API_KEY` - Google Gemini API key
- `PINECONE_API_KEY` - Pinecone vector database key
- `MONITORING_API_KEY` - External monitoring service key
- `HTTP_PROXY` / `HTTPS_PROXY` - Proxy settings
- `MAX_API_CONCURRENCY` - Performance tuning

**Configuration Files:**
- `.env` - API keys and secrets (auto-loaded)
- `config.yaml` - Application settings and AI provider configs
- `crawl_pipeline.yaml` - LLM processing pipelines and prompts

**Security Notes:**
- 🔒 `.env` files are automatically gitignored
- 🚫 Never commit real API keys
- ✅ Environment variables override YAML config
- 🔄 Changes require server restart (not hot-reloaded)

**Content Filtering:**
```bash
# Exclude certain file types
curl "/https://example.com?exclude_file_types=.xml,.rss,.json"

# Exclude URL patterns
curl "/https://example.com?exclude_url_patterns=.*/api/.*,.*/search\\.php.*"

# Combined filtering
curl "/https://example.com?exclude_file_types=.xml,.rss&exclude_url_patterns=.*/admin/.*"
```

**Custom Headers for Bypass:**
```bash
# Custom User-Agent
curl "/https://example.com?custom_headers={\"User-Agent\":\"Custom-Bot/1.0\"}"

# CORS bypass headers
curl "/https://example.com?custom_headers={\"Origin\":\"https://trusted-site.com\",\"Sec-Fetch-Mode\":\"navigate\"}"

# Multiple headers
curl "/https://example.com?custom_headers={\"User-Agent\":\"Bot\",\"Authorization\":\"Bearer%20token\",\"X-Custom\":\"value\"}"
```

#### Request Methods
- **GET**: Extract content using URL path
- **POST**: Extract content using JSON payload

#### Request Headers

| Header | Values | Description |
|--------|--------|-------------|
| `Accept` | `application/json`, `text/plain`, `text/html`, `text/markdown` | Response format |
| `User-Agent` | String | Custom user agent string |
| `X-Respond-With` | `screenshot`, `pageshot` | Return image URL |
| `X-Timeout` | Number (seconds) | Request timeout override |
| `Authorization` | Bearer token | API authentication |

#### Request Parameters (URL Query)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | markdown | Response format (`json`, `markdown`, `html`) |
| `ai_enabled` | boolean | config default | Override AI processing enable/disable |
| `api_key` | string | config default | Override API key for AI processing |
| `model` | string | config default | Override AI model |
| `prompt` | string | config default | Custom prompt for AI processing |
| `exclude_file_types` | string | config default | Comma-separated file extensions to exclude |
| `exclude_url_patterns` | string | config default | Comma-separated URL patterns to exclude |
| `custom_headers` | string | config default | JSON string of custom headers |
| `timeout` | number | 30000 | Request timeout in milliseconds |
| `wait` | number | 0 | Wait time before extraction (ms) |
| `screenshot.wait` | number | 2000 | Screenshot wait time (ms) |
| `screenshot.width` | number | 1200 | Screenshot viewport width |
| `screenshot.height` | number | auto | Screenshot viewport height |
| `screenshot.fullpage` | boolean | false | Capture full page |
| `screenshot.scale` | float | 1.0 | Screenshot scale factor |

#### Response Formats

**JSON Response (Accept: application/json):**
```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "content": "Clean markdown content...",
  "links": ["https://related-link.com"],
  "images": ["https://image.jpg"],
  "meta": {
    "author": "Author Name",
    "description": "Page description",
    "publishedDate": "2023-01-01",
    "lang": "en"
  },
  "metadata": {
    "processingTime": 2.34,
    "contentLength": 1024,
    "imageCount": 3,
    "linkCount": 12
  }
}
```

**Markdown Response (default):**
```markdown
# Example Domain

This domain is for use...
- Link One
- Link Two

![Alt Text](image.jpg)
```

**Screenshot Response:**
```json
{
  "url": "https://localhost:3000/screenshots/screenshot_1640995200000.png",
  "filename": "screenshot_1640995200000.png",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📋 Queue Management API

### Endpoint: `/queue/stats`

**Get queue statistics**

```bash
curl "/queue/stats"
```

**Response:**
```json
{
  "status": "operational",
  "total_requests": 42,
  "active_requests": 2,
  "pending_requests": 5,
  "completed_requests": 35,
  "failed_requests": 0,
  "max_concurrent": 5
}
```

### Endpoint: `/queue/reset`

**Reset queue statistics**

```bash
curl -X POST "/queue/reset"
```

**Response:**
```json
{
  "success": true,
  "message": "Queue statistics reset successfully",
  "reseted": "2024-01-01T00:00:00.000Z"
}
```

### Endpoint: `/queue/clear`

**Clear all pending jobs**

```bash
curl -X POST "/queue/clear"
```

**Response:**
```json
{
  "success": true,
  "cleared": 5,
  "message": "5 pending jobs cleared"
}
```

## 🎨 Web Interface Endpoints

### Endpoint: `/` (Root)

**Main dashboard web interface**

Serves `index.html` with:
- API usage examples
- Response format documentation
- Direct links to queue monitor
- Quick test links

### Endpoint: `/queue-ui`

**Queue monitoring web interface**

Serves `queue.html` with:
- Real-time queue statistics
- Request processing status
- Reset controls
- Navigation to main dashboard

## 📦 Storage Endpoints

### Endpoint: `/screenshots/[filename]`

**Access captured screenshots**

```bash
# Access saved screenshot
curl "/screenshots/screenshot_1640995200000.png"
```

### Endpoint: `/logs/[filename]`

**Download application logs**

```bash
# Access processing logs
curl "/logs/crawler.log"
```

## 🔧 Performance & Configuration

### Request Limits

| Setting | Value | Description |
|---------|-------|-------------|
| Max concurrent requests | 10 | Wrap requests beyond limit |
| Request timeout | 30s | Default timeout for page loads |
| Screenshot timeout | 5s | Additional wait for screenshots |
| Max content length | 5MB | Maximum extracted content |
| Rate limit | None | No built-in rate limiting |

### Error Handling

**404 Not Found:**
```json
{
  "error": "Page not found",
  "code": 404,
  "details": "URL responds with 404 status"
}
```

**429 Too Many Requests:**
```json
{
  "error": "Too many requests",
  "code": 429,
  "retryAfter": 60,
  "details": "Please wait before retrying"
}
```

**503 Service Unavailable:**
```json
{
  "error": "Service temporarily unavailable",
  "code": 503,
  "details": "All request slots are occupied"
}
```

## 🛠️ Development Endpoints

### Endpoint: `/status`

**Health check endpoint**

```bash
curl "/status"
```

**Response:**
```json
{
  "status": "healthy",
  "version": "0.0.1",
  "uptime": 3600,
  "services": {
    "crawler": "running",
    "storage": "healthy",
    "queue": "operational"
  }
}
```

### Endpoint: `/debug/config`

**Current configuration values**

(Only available in development mode)

## 📝 Integration Examples

### Python Integration
```python
import requests

# Simple content extraction
response = requests.get("http://localhost:3000/https://example.com")
content = response.text

# JSON with metadata
response = requests.get(
    "http://localhost:3000/https://example.com",
    headers={"Accept": "application/json"}
)
data = response.json()
print(f"Title: {data['title']}")
print(f"Content length: {len(data['content'])}")
```

### JavaScript/Node.js Integration
```javascript
const fetch = require('node-fetch');

// Extract with promises
fetch("http://localhost:3000/https://example.com")
    .then(res => res.text())
    .then(content => console.log(content))
    .catch(err => console.error(err));

// Extract with metadata
fetch("http://localhost:3000/https://example.com", {
    headers: { 'Accept': 'application/json' }
})
    .then(res => res.json())
    .then(data => {
        console.log(`Extracted ${data.metadata.linkCount} links`);
    });
```

<!-- 🍎 Educational Note: This API enables programmatic access to web content, making it easier for educational tools and literacy programs to process online materials for students with diverse learning needs. -->
