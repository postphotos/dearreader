# 🏗️ Architecture Overview

## System Architecture

Dear Reader is a **single-purpose local web crawling service** that converts individual URLs into LLM-friendly JSON format. 

**Important Scope Clarification**: This tool is designed specifically for converting individual webpages in a queue - NOT for storing or processing entire websites. For full-site crawling, indexing, or bulk processing, you'll need other specialized tools. No LLM processing happens directly here; this is purely a content extraction and formatting service.

The system is designed for local deployment with Docker containerization and follows a modular, service-oriented architecture optimized for individual page processing.

### Core Components

#### 1. **Web Server (Express.js)**
- **Location**: `js/src/server.ts`
- **Purpose**: Main HTTP server handling API requests
- **Port**: 3001 (local development)
- **Endpoints**:
  - `GET /` - Web dashboard
  - `GET /queue` - Queue management interface
  - `GET /[url]` - Content extraction API
  - `POST /api/crawl` - Advanced crawling with options

#### 2. **Crawler Engine (Puppeteer)**
- **Location**: `js/src/services/puppeteer.ts`
- **Purpose**: Headless browser-based web scraping
- **Features**:
  - JavaScript rendering support
  - Screenshot capture
  - Content extraction with metadata
  - Robots.txt compliance checking

#### 3. **Queue Management System**
- **Location**: `js/src/services/queue-manager.ts`
- **Purpose**: Manages crawling requests and rate limiting
- **Features**:
  - Request queuing and prioritization
  - Rate limiting per domain
  - Concurrent request management

#### 4. **Database Layer (Local Storage)**
- **Location**: `js/src/shared/lib/storage.ts`
- **Purpose**: Local data persistence for crawled content
- **Current State**: Local filesystem-based storage
- **Features**:
  - Content caching
  - Screenshot storage
  - Metadata persistence

#### 5. **Content Processing Services**
- **PDF Extraction**: `js/functions/src/services/pdf-extract.ts`
- **Image Processing**: `js/functions/src/shared/services/canvas.ts`
- **Geolocation**: `js/functions/src/services/geoip.ts`
- **Rate Limiting**: `js/functions/src/shared/services/rate-limit.ts`

### Data Flow

```
User Request → Express Server → Queue Manager → Crawler Engine → Content Processing → Response
                      ↓
                Database Cache
                      ↓
               File Storage (Screenshots)
```

### Docker Architecture

#### Development Environment
- **Multi-service setup** with docker-compose profiles
- **Hot reloading** for development
- **Isolated test environment** for reliable testing

#### Production Environment
- **Single optimized container** with multi-stage build
- **Debian-based** for better Chromium compatibility
- **Minimal attack surface** with production hardening

### Security Architecture

#### Local-First Design
- **No external API keys required**
- **Runs entirely on local hardware**
- **No data sent to external services**
- **User-controlled data retention**

#### Content Security
- **Robots.txt compliance** checking
- **Domain blocking** capabilities
- **Rate limiting** per domain
- **Content sanitization** before processing

### File Structure

```
dearreader/
├── docker/                    # Docker configuration
│   ├── Dockerfile            # Multi-stage build (dev/prod)
│   └── docker-compose.yml    # Service orchestration
├── js/                       # Main Node.js/TypeScript application
│   ├── src/
│   │   ├── server.ts         # Express server
│   │   ├── services/         # Core services (Puppeteer, queue, etc.)
│   │   ├── shared/           # Shared utilities and types
│   │   ├── db/              # Database/storage models
│   │   └── utils/           # Helper functions
│   ├── public/              # Web assets (HTML, CSS, JS)
│   ├── build/               # Compiled TypeScript output
│   └── package.json         # Node.js dependencies
├── py/                      # Python utilities
│   ├── app.py              # Main runner script
│   ├── demo.py             # API demo script
│   ├── speedtest.py        # Performance testing
│   ├── tests/              # Python test files
│   ├── requirements.txt    # Python dependencies
│   └── pyproject.toml      # Python project configuration
├── storage/                # Local file storage
├── docs/                   # Documentation
└── config.yaml            # Application configuration
```

### API Architecture

#### RESTful Endpoints
- **Content Extraction**: `GET /https://example.com`
- **Queue Management**: `GET /queue`
- **Health Check**: `GET /health`

#### Response Format
```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "content": "Extracted content...",
  "metadata": {
    "description": "Page description",
    "keywords": ["keyword1", "keyword2"],
    "author": "Content author"
  },
  "screenshot": "/storage/screenshot_123.png",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Testing Architecture

#### Unit Tests
- **Location**: `js/src/**/__tests__/`
- **Framework**: Mocha + Chai
- **Coverage**: Core services and utilities

#### Integration Tests
- **Location**: `js/test/`
- **Purpose**: End-to-end API testing
- **Environment**: Local Node.js runtime

#### Python Tests
- **Location**: `py/tests/`
- **Purpose**: Utility function testing
- **Framework**: pytest

### Deployment Architecture

#### Local Development
```bash
# Start development environment
cd js && npm run build:watch &
cd js && npm run serve &

# Run tests
cd js && npm test
cd py && python demo.py

# Stop all services
pkill -f "node.*serve"
```

#### Production Deployment
```bash
# Build for production
cd js && npm run build

# Start production server
cd js && npm run serve
```

### Monitoring & Observability

#### Logging
- **Structured logging** with Winston
- **Log levels**: ERROR, WARN, INFO, DEBUG
- **Output**: Console and rotating files

#### Health Checks
- **Service health**: `/health` endpoint
- **Database connectivity**: Automatic verification
- **Resource usage**: Memory and CPU monitoring

### Configuration Management

#### Environment Variables
- `NODE_ENV`: Development/Production mode
- `PORT`: Server port (default: 3001)
- `STORAGE_PATH`: Local storage directory

#### Configuration Files
- `config.yaml`: Application settings
- `docker-compose.yml`: Service configuration
- `package.json`: Node.js dependencies

### Performance Considerations

#### Caching Strategy
- **Content caching**: Recently crawled pages
- **Screenshot storage**: Local filesystem
- **Metadata caching**: Database-backed

#### Resource Management
- **Memory limits**: Configurable per container
- **Concurrent requests**: Queue-based throttling
- **Browser pooling**: Puppeteer instance reuse

### Future Extensibility

#### Plugin Architecture
- **Service interfaces**: Extensible service layer
- **Content processors**: Pluggable extraction modules
- **Output formats**: Multiple format support

#### Cloud Integration (Optional)
- **Firebase compatibility**: Existing configuration
- **Cloud Storage**: Screenshot upload option
- **Firestore**: Remote data synchronization

This architecture provides a robust, local-first web crawling solution with comprehensive testing, documentation, and deployment capabilities.
