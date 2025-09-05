# 📚 Reader: Enhanced Local Deployment Edition

This is a feature-enhanced fork of [Jina AI's Reader](https://github.com/jina-ai/reader) optimized for local deployment and development. This fork uses a Debian-based Docker image (instead of Alpine) for better compatibility with Chromium/Puppeteer dependencies and native libraries, ensuring more reliable web scraping operations.

## 🎯 What it does
It converts any URL to an LLM-friendly input with `http://127.0.0.1:3000/https://google.com`. Get improved output for your agent and RAG systems at no cost. This tool helps you prepare web content for Large Language Models, making it easier to process and analyze online information.

## 🚀 Enhanced Features
- 🏠 Runs locally using Docker with optimized Debian base image
- 🔑 No API keys required - works out of the box!
- 🖼️ Saves screenshots locally instead of uploading to Google Cloud Storage
- 📥 Provides download URLs for saved screenshots
- 🌐 Converts web content to LLM-friendly formats with improved JSON API
- 🧪 **NEW**: Comprehensive test suite for reliability and development
- 🔗 **NEW**: Enhanced link extraction and metadata parsing
- 📊 **NEW**: Closer API parity with Jina.ai's cloud service for local crawling
- 🛠️ **NEW**: Complete development environment setup with Firebase Functions

## ⚠️ Limitations
- 📄 Currently does not support parsing PDFs

This demonstrates that the Reader can run effectively even on minimal hardware resources while maintaining full feature parity with the cloud service.
## 🐳 Docker Deployment

### Building the image locally
1. Clone the repository:
   ```bash
   git clone https://github.com/intergalacticalvariable/reader.git
   cd reader
   ```
2. Build the Docker image:
   ```bash
   docker build -t reader .
   ```
3. Run the container:
   ```bash
   docker run -p 3000:3000 -v ./storage:/app/local-storage reader-app
   ```

## 🧪 Quick Demo

1. Setup Python environment:
   ```bash
   uv pip install requests
   ```

2. Run the demo script:
   ```bash
   uv run demo.py
   ```

The demo will test Wikipedia pages and demonstrate all API formats (JSON, Markdown, HTML, Text, Screenshots).

## 🖥️ Usage & API Specification

Once the Docker container is running, you can access the Reader API at `http://127.0.0.1:3000`. The API provides full compatibility with Jina.ai's cloud service.

### Base Endpoint
```
http://127.0.0.1:3000/{URL}
```

### Response Formats

#### 1. 📝 JSON Response (Default)
Returns structured data with content, metadata, and extracted links:

```bash
# Default JSON response
curl 'http://127.0.0.1:3000/https://example.com'

# Explicit JSON request
curl -H "Accept: application/json" 'http://127.0.0.1:3000/https://example.com'
```

**JSON Response Structure:**
```json
{
  "code": 200,
  "status": 20000,
  "data": {
    "title": "Page Title",
    "description": "Page description or excerpt",
    "url": "https://example.com",
    "content": "Main content in markdown format",
    "metadata": {
      "title": "Page Title",
      "description": "Meta description",
      "lang": "en",
      "siteName": "Site Name",
      "og:title": "Open Graph title",
      "og:description": "Open Graph description",
      "og:site_name": "Site Name",
      "article:author": "Author Name",
      "article:published_time": "2023-01-01"
    },
    "links": {
      "https://example.com/link1": "Link Text 1",
      "https://example.com/link2": "Link Text 2"
    },
    "images": {
      "https://example.com/image1.jpg": "Alt text for image"
    }
  }
}
```

#### 2. 📝 Markdown Response
Returns clean markdown content:

```bash
curl -H "Accept: text/plain" 'http://127.0.0.1:3000/https://example.com'
# or
curl -H "X-Respond-With: markdown" 'http://127.0.0.1:3000/https://example.com'
```

#### 3. 🌐 HTML Response
Returns cleaned HTML (documentElement.outerHTML):

```bash
curl -H "X-Respond-With: html" 'http://127.0.0.1:3000/https://example.com'
```

#### 4. 📄 Text Response
Returns plain text (document.body.innerText):

```bash
curl -H "X-Respond-With: text" 'http://127.0.0.1:3000/https://example.com'
```

#### 5. 📸 Screenshot Responses
Returns URL to locally saved screenshot:

```bash
# Screen-size screenshot
curl -H "X-Respond-With: screenshot" 'http://127.0.0.1:3000/https://example.com'

# Full-page screenshot
curl -H "X-Respond-With: pageshot" 'http://127.0.0.1:3000/https://example.com'
```

### Query Parameters

- `?no-cache=true` - Bypass cache and fetch fresh content
- `?timeout=30000` - Set request timeout in milliseconds (default: 30000)

### Error Responses

```json
{
  "code": 400,
  "status": 40000,
  "message": "Invalid URL or TLD"
}
```

```json
{
  "code": 500,
  "status": 50000,
  "message": "Internal server error"
}
```

## �️ Development & Testing Setup

This fork includes a comprehensive development environment with Firebase Functions emulation and a complete test suite.

### Prerequisites
- Node.js 20
- npm or yarn
- Firebase CLI (optional, for emulator features)

### Local Development Setup

1. **Clone and Install Dependencies:**
   ```bash
   git clone https://github.com/intergalacticalvariable/reader.git
   cd reader/backend/functions
   npm install
   ```

2. **Build the TypeScript Code:**
   ```bash
   npm run build
   ```

3. **Run Tests:**
   ```bash
   # Run all tests
   npm test
   
   # Run tests in watch mode
   npm run test:watch
   ```

4. **Start Development Server (Option 1 - Simple):**
   ```bash
   # Build and start the Express server directly
   npm run build
   node build/server.js
   ```

5. **Start Development Server (Option 2 - Firebase Emulator):**
   ```bash
   # Start Firebase Functions emulator with hot reload
   npm run from-scratch
   
   # Or start with existing data
   npm run serve
   ```

### Development Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Watch mode compilation
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run serve` - Start Firebase emulator with build
- `npm run debug` - Start with debug inspector
- `npm run lint` - Run ESLint

### Testing Framework

The project includes comprehensive tests covering:
- JSON response format validation
- Link extraction functionality
- Markdown content processing
- Error handling scenarios
- API endpoint compatibility

**Test Structure:**
```
src/cloud-functions/__tests__/
├── crawler.test.ts         # Main API tests
└── ...                     # Additional test files
```

**Running Specific Tests:**
```bash
# Run with verbose output
NODE_OPTIONS='--loader ts-node/esm' mocha src/**/__tests__/**/*.ts --reporter spec

# Run specific test file
NODE_OPTIONS='--loader ts-node/esm' mocha src/cloud-functions/__tests__/crawler.test.ts
```

### Project Structure

```
backend/functions/
├── src/
│   ├── cloud-functions/
│   │   ├── crawler.ts           # Main crawler endpoint
│   │   └── __tests__/          # Test files
│   ├── services/               # Service layer
│   ├── utils/                  # Utility functions
│   └── index.ts               # Firebase Functions entry
├── package.json
├── tsconfig.json
└── firebase.json
```

### Environment Configuration

The development environment supports:
- **Local Storage**: Screenshots saved to `./local-storage/`
- **Firebase Emulation**: Full Firebase Functions environment
- **Hot Reload**: Automatic rebuilds on file changes
- **Debug Mode**: Inspector support for debugging
- **Proxy Support**: HTTP/HTTPS proxy configuration

### API Development Tips

1. **Testing JSON Responses:**
   ```bash
   curl -H "Accept: application/json" 'http://localhost:5001/YOUR_PROJECT/us-central1/crawler/https://example.com'
   ```

2. **Testing Error Handling:**
   ```bash
   curl 'http://localhost:5001/YOUR_PROJECT/us-central1/crawler/invalid-url'
   ```

3. **Testing Screenshots:**
   ```bash
   curl -H "X-Respond-With: screenshot" 'http://localhost:5001/YOUR_PROJECT/us-central1/crawler/https://example.com'
   ```

## 🙏 Acknowledgements
This project is based on the excellent work done by multiple contributors:
1. The original [Jina AI Reader project](https://github.com/jina-ai/reader), which provided the foundation for this tool.
2. [Harsh Gupta's adaptation](https://github.com/hargup/reader), which served as the immediate basis for this Docker deployment version.

## 📜 License
This project is licensed under Apache-2.0 same as the original Jina AI Reader project.
