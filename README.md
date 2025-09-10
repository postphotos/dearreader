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

### LLM Providers
Configure AI providers in `crawl_pipeline.yaml`:

```yaml
llm_providers:
  primary_text:
    provider: "openai-gpt-4"
    model: "gpt-4"
    temperature: 0.2
    max_tokens: 2048

  fast_processing:
    provider: "openai-gpt-3.5-turbo"
    model: "gpt-3.5-turbo"
    temperature: 0.3
    max_tokens: 1024
```

### Custom Prompts
Define reusable prompts for common tasks:

```yaml
prompts:
  html_to_markdown:
    name: "Convert HTML to Markdown"
    template: |
      Convert the following HTML to clean Markdown...
      {content}

  extract_metadata:
    name: "Extract Content Metadata"
    template: |
      Extract metadata from: {content}
```

### Processing Pipelines
Create custom pipelines for different content types:

```yaml
pipelines:
  html_default:
    content_type: "html"
    stages:
      - name: "crawl_content"
        type: "crawl"
      - name: "convert_to_markdown"
        type: "llm_process"
        llm_provider: "fast_processing"
        prompt: "html_to_markdown"
      - name: "extract_metadata"
        type: "llm_process"
        llm_provider: "primary_text"
        prompt: "extract_metadata"
```

### Programmatic Steps
Add custom code execution to pipelines:

```yaml
programmatic_steps:
  database_update:
    type: "javascript"
    code: |
      const db = require('./database');
      await db.updateContent({
        url: context.url,
        title: context.metadata?.title,
        content: context.markdown_content
      });
      return { success: true };

pipelines:
  html_with_db:
    stages:
      # ... other stages ...
      - name: "save_to_database"
        type: "programmatic"
        step: "database_update"
```

## API Reference

### Endpoints

#### `GET /json/{url}`
Crawl a URL and return processed content as JSON.

**Parameters:**
- `url` (path): URL to crawl (URL-encoded)
- `pipeline` (query, optional): Pipeline to use (default: auto-detect)
- `timeout_ms` (query, optional): Timeout in milliseconds

**Example:**
```bash
curl "http://localhost:3000/json/https://example.com/article?pipeline=html_enhanced"
```

#### `POST /crawl`
Crawl a URL with custom configuration.

**Request Body:**
```json
{
  "url": "https://example.com",
  "pipeline": "html_enhanced",
  "options": {
    "timeout_ms": 30000,
    "include_metadata": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "content_type": "html",
  "pipeline_used": "html_enhanced",
  "processing_time_ms": 2450,
  "result": {
    "title": "Example Article",
    "markdown_content": "# Example Article\n\nContent here...",
    "metadata": {
      "author": "John Doe",
      "date": "2024-01-15"
    }
  }
}
```

#### `GET /health`
Service health check endpoint.

## CLI Reference

### Commands

#### `dearreader crawl <url> [options]`
Crawl a single URL and process it.

**Options:**
- `--pipeline <name>`: Pipeline to use (default: auto-detect)
- `--output <file>`: Save result to JSON file
- `--timeout <ms>`: Timeout in milliseconds (default: 30000)
- `--verbose`: Enable verbose logging

**Examples:**
```bash
dearreader crawl "https://example.com"
dearreader crawl "https://example.com" --pipeline html_enhanced
dearreader crawl "https://example.com" --output result.json --verbose
```

#### `dearreader config`
Display current configuration.

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