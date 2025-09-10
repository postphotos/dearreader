# DearReader - AI-Powered Single URL Content Processing

**Process one URL at a time with AI-powered extraction and transformation.**

DearReader is a focused content processing service that provides AI-powered extraction and processing of web content from **single URLs only**. It emphasizes simplicity, reliability, and programmatic extensibility.

## What DearReader Provides ✅

### Core Features
- **CLI Interface**: Simple command-line tool for crawling single URLs
- **REST API**: HTTP endpoints for programmatic access
- **AI-Powered Processing**: LLM integration for content analysis and transformation
- **Configurable Pipelines**: Custom processing workflows for different content types
- **Programmatic Steps**: Execute custom code during processing (database updates, webhooks, etc.)
- **Multiple LLM Providers**: Support for OpenAI, Anthropic, Google Gemini, and more
- **Content Type Detection**: Automatic handling of HTML, PDF, and other formats

### Interfaces
```bash
# CLI Usage
dearreader crawl "https://example.com/article"
dearreader crawl "https://example.com" --pipeline html_enhanced --output result.json
```

```javascript
// API Usage
GET http://localhost:3000/json/https://example.com/article

POST http://localhost:3000/crawl
{
  "url": "https://example.com",
  "pipeline": "html_enhanced",
  "options": { "timeout_ms": 30000 }
}
```

## What DearReader Does NOT Provide ❌

### No Queue Management
- **No batch processing** - processes one URL at a time
- **No URL discovery** - doesn't crawl sitemaps or find related URLs
- **No scheduling** - no built-in cron jobs or automation
- **No distributed processing** - single-instance service

### No XML/Sitemap Parsing
- **No sitemap.xml processing** - doesn't parse XML to discover URLs
- **No robots.txt compliance** - doesn't check crawling permissions
- **No URL normalization** - expects properly formatted URLs

### Single-URL Focus
- **One URL per request** - processes exactly one URL at a time
- **No concurrent crawling** - sequential processing only
- **No rate limiting across requests** - each request is independent

## Quick Start

### Installation
```bash
npm install -g dearreader
# or
git clone https://github.com/your-org/dearreader.git
cd dearreader && npm install
```

### Basic Usage
```bash
# Crawl a webpage and get JSON result
dearreader crawl "https://example.com/article"

# Use enhanced pipeline with more processing
dearreader crawl "https://example.com" --pipeline html_enhanced

# Process a PDF
dearreader crawl "https://example.com/document.pdf" --pipeline pdf_default

# Save output to file
dearreader crawl "https://example.com" --output article.json
```

### API Usage
```bash
# Start the service
npm start

# Get JSON result via API
curl "http://localhost:3000/json/https://example.com/article"

# Post with custom options
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "pipeline": "html_enhanced",
    "options": {
      "timeout_ms": 30000,
      "include_metadata": true
    }
  }'
```

## Configuration

### Hot Reloading
DearReader supports **hot reloading** of configuration changes without requiring server restart:

```yaml
# config.yaml - Changes are automatically detected and applied
robots:
  respect_robots_txt: false  # Change this and see it take effect immediately

ai_enabled: false  # Disable AI processing globally
```

**Features:**
- Automatic detection of `config.yaml` changes
- No server restart required
- Real-time configuration updates
- Error handling for invalid configurations

### LLM Usage (Optional)
AI/LLM processing is **completely optional** and can be disabled:

```yaml
# Disable all AI processing
ai_enabled: false

# Or configure specific providers
ai_enabled: true
ai_providers:
  openai-gpt-4:
    api_key: "your-api-key"
    model: "gpt-4"
    # ... other settings
```

### Exclude File Types
Prevent processing of unwanted file types:

```yaml
content:
  # Exclude specific file extensions
  exclude_file_types: ".xml, .rss, .atom, .json, .css, .js, .png, .jpg, .jpeg, .gif"
  
  # Exclude URL patterns (regex)
  exclude_url_patterns: ".*\\.xml$, .*/search\\.php.*, .*/api/.*, .*/wp-admin/.*"
```

**Examples:**
```bash
# Exclude multiple file types
exclude_file_types: ".pdf, .xml, .jpg, .png, .gif, .css, .js"

# Exclude specific URL patterns
exclude_url_patterns: ".*\\.xml$, .*/api/.*, .*/admin/.*, .*/search\\?q=.*"
```

### Additional Headers for Bypass
Configure custom headers to bypass restrictions:

```yaml
headers:
  custom_headers:
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    "Accept-Language": "en-US,en;q=0.5"
  
  cors_bypass_headers:
    "Origin": "https://example.com"
    "Sec-Fetch-Mode": "navigate"
  
  robots_bypass_headers:
    "X-Robots-Tag": "noindex,nofollow"
```

### LLM Providers
Configure AI providers in `config.yaml`:

```yaml
ai_providers:
  openai-gpt-4:
    api_key: "your-api-key"
    base_url: "https://api.openai.com/v1"
    model: "gpt-4"
    temperature: 0.2
    max_tokens: 2048

  openai-gpt-3.5-turbo:
    api_key: "your-api-key"
    base_url: "https://api.openai.com/v1"
    model: "gpt-3.5-turbo"
    temperature: 0.3
    max_tokens: 1024
```

## API Reference

### Endpoints

#### `GET /api/crawl`
Crawl a URL and return processed content.

**Parameters:**
- `url` (query, required): URL to crawl
- `format` (query, optional): Response format (`json`, `markdown`, `html`) - default: `markdown`
- `ai_enabled` (query, optional): Override AI processing (`true`/`false`)
- `api_key` (query, optional): Override API key for AI processing
- `model` (query, optional): Override AI model
- `prompt` (query, optional): Custom prompt for AI processing
- `exclude_patterns` (query, optional): Comma-separated patterns to exclude
- `custom_headers` (query, optional): JSON string of custom headers
- `timeout` (query, optional): Request timeout in milliseconds

**Examples:**
```bash
# Basic crawling
curl "http://localhost:3001/api/crawl?url=https://example.com"

# JSON response with AI processing
curl "http://localhost:3001/api/crawl?url=https://example.com&format=json&ai_enabled=true"

# Override AI settings on-the-fly
curl "http://localhost:3001/api/crawl?url=https://example.com&ai_enabled=true&model=gpt-4&api_key=your-key"

# Custom prompt
curl "http://localhost:3001/api/crawl?url=https://example.com&prompt=Extract%20key%20points%20from%20this%20article"

# Exclude certain content
curl "http://localhost:3001/api/crawl?url=https://example.com&exclude_patterns=.xml,.rss"

# Custom headers for bypass
curl "http://localhost:3001/api/crawl?url=https://example.com&custom_headers={\"User-Agent\":\"Custom-UA\",\"X-Bypass\":\"true\"}"
```

#### `POST /api/crawl`
Crawl a URL with advanced configuration.

**Request Body:**
```json
{
  "url": "https://example.com",
  "format": "json",
  "ai": {
    "enabled": true,
    "provider": "openai-gpt-4",
    "api_key": "your-api-key",
    "model": "gpt-4",
    "prompt": "Extract key information from this content",
    "temperature": 0.2
  },
  "content": {
    "exclude_file_types": ".xml,.rss,.json",
    "exclude_url_patterns": ".*\\.xml$,.*/api/.*"
  },
  "headers": {
    "custom": {
      "User-Agent": "Custom User Agent",
      "Authorization": "Bearer token"
    },
    "cors_bypass": true,
    "robots_bypass": true
  },
  "options": {
    "timeout_ms": 30000,
    "max_content_length": 1000000
  }
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "processing_time_ms": 2450,
  "content_excluded": false,
  "ai_processed": true,
  "result": {
    "title": "Example Article",
    "content": "Extracted content...",
    "metadata": {
      "author": "John Doe",
      "date": "2024-01-15"
    }
  }
}
```

#### `GET /health`
Service health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "0.0.1",
  "checks": {
    "config": {
      "status": "pass",
      "configFileExists": true
    },
    "memory": {
      "status": "pass",
      "heapUsed": "87MB"
    }
  }
}
```

## CLI Reference

### Commands

#### `dearreader crawl <url> [options]`
Crawl a single URL and process it.

**Options:**
- `--format <type>`: Output format (`json`, `markdown`, `html`) - default: `markdown`
- `--output <file>`: Save result to file
- `--ai-enabled`: Enable AI processing
- `--ai-disabled`: Disable AI processing (default)
- `--api-key <key>`: Override API key for AI processing
- `--model <model>`: Override AI model (e.g., `gpt-4`, `claude-3`)
- `--prompt <text>`: Custom prompt for AI processing
- `--exclude-types <types>`: Comma-separated file extensions to exclude
- `--exclude-patterns <patterns>`: Comma-separated URL patterns to exclude
- `--custom-headers <json>`: JSON string of custom headers
- `--timeout <ms>`: Request timeout in milliseconds
- `--verbose`: Enable verbose logging

**Examples:**
```bash
# Basic crawling
dearreader crawl "https://example.com"

# JSON output with AI processing
dearreader crawl "https://example.com" --format json --ai-enabled

# Override AI settings
dearreader crawl "https://example.com" --ai-enabled --model gpt-4 --api-key your-key

# Custom prompt
dearreader crawl "https://example.com" --prompt "Summarize this article in 3 bullet points"

# Exclude certain content
dearreader crawl "https://example.com" --exclude-types ".xml,.rss,.json"

# Custom headers
dearreader crawl "https://example.com" --custom-headers '{"User-Agent":"Custom-UA","X-Bypass":"true"}'

# Save to file
dearreader crawl "https://example.com" --output result.json --verbose
```

#### `dearreader config`
Display current configuration and hot-reload status.

#### `dearreader health`
Check service health and connectivity.

## Default Pipelines

### HTML Processing Pipeline
```yaml
html_default:
  content_type: "html"
  stages:
    - name: "crawl_content"
      type: "crawl"
      description: "Crawl and extract HTML content"
    - name: "convert_to_markdown"
      type: "llm_process"
      llm_provider: "fast_processing"
      prompt: "html_to_markdown"
    - name: "extract_metadata"
      type: "llm_process"
      llm_provider: "primary_text"
      prompt: "extract_metadata"
    - name: "format_as_json"
      type: "llm_process"
      llm_provider: "fast_processing"
      prompt: "json_formatting"
```

### Enhanced HTML Pipeline
```yaml
html_enhanced:
  content_type: "html"
  stages:
    - name: "crawl_content"
      type: "crawl"
    - name: "convert_to_markdown"
      type: "llm_process"
      llm_provider: "fast_processing"
      prompt: "html_to_markdown"
    - name: "categorize_content"
      type: "llm_process"
      llm_provider: "primary_text"
      prompt: "content_categorization"
    - name: "extract_business_info"
      type: "llm_process"
      llm_provider: "primary_text"
      prompt: "business_info_extraction"
    - name: "extract_metadata"
      type: "llm_process"
      llm_provider: "primary_text"
      prompt: "extract_metadata"
    - name: "format_as_json"
      type: "llm_process"
      llm_provider: "fast_processing"
      prompt: "json_formatting"
```

### PDF Processing Pipeline
```yaml
pdf_default:
  content_type: "pdf"
  stages:
    - name: "download_pdf"
      type: "crawl"
      description: "Download PDF file"
    - name: "extract_text"
      type: "pdf_extract"
      description: "Extract text from PDF"
    - name: "quality_check"
      type: "llm_process"
      llm_provider: "primary_text"
      prompt: "pdf_quality_check"
    - name: "ocr_extraction"
      type: "llm_process"
      llm_provider: "primary_vision"
      prompt: "pdf_ocr_extraction"
    - name: "format_as_json"
      type: "llm_process"
      llm_provider: "fast_processing"
      prompt: "json_formatting"
```

## Architecture

### Service Components
- **Crawler**: Handles URL fetching and content extraction
- **Pipeline Engine**: Orchestrates processing stages
- **LLM Manager**: Manages AI provider interactions
- **Programmatic Executor**: Runs custom JavaScript code
- **Result Formatter**: Structures output data

### Data Flow
1. **Input**: Single URL via CLI or API
2. **Crawling**: Fetch content from URL
3. **Processing**: Apply configured pipeline stages
4. **AI Processing**: Use LLMs for analysis/transformation
5. **Programmatic Steps**: Execute custom code (optional)
6. **Output**: Return structured JSON result

### Error Handling
- Automatic retries with exponential backoff
- Fallback LLM providers
- Graceful degradation for failed steps
- Comprehensive error reporting

## Development

### Running Tests
```bash
npm test                    # Run all tests
npm run test:e2e           # Run end-to-end tests
npm run test:integration   # Run integration tests
```

### Building
```bash
npm run build              # Build for production
npm run dev               # Development mode with hot reload
```

### Configuration
- `crawl_pipeline.yaml`: Main configuration file
- Environment variables for API keys and settings
- Hot-reload support for configuration changes

## Examples

### Basic HTML Processing
```bash
dearreader crawl "https://techcrunch.com/article" --pipeline html_default
```

### Enhanced HTML with Business Info
```bash
dearreader crawl "https://yelp.com/business/example" --pipeline html_enhanced
```

### PDF Processing
```bash
dearreader crawl "https://example.com/document.pdf" --pipeline pdf_default
```

### API with Custom Pipeline
```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "pipeline": "html_enhanced",
    "options": {
      "timeout_ms": 45000
    }
  }'
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**Remember**: DearReader processes one URL at a time with AI-powered analysis. For batch processing or URL discovery, consider integrating with external queue management systems.