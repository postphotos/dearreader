# 📚 Dear Reader: Enhanced Local Deployment Edition

This is a feature-enhanced fork of [Jina AI's Reader](https://github.com/jina-ai/reader) optimized for local deployment and development. This fork uses a Debian-based Docker image (instead of Alpine) for better compatibility with Chromium/Puppeteer dependencies and native libraries, ensuring more reliable web scraping operations.

## 🎯 What it does
It converts any URL to an LLM-friendly input with `http://127.0.0.1:3000/https://google.com`. Get improved output for your agent and RAG systems at no cost. This tool helps you prepare web content for Large Language Models, making it easier to process and analyze online information.

## 🏗️ Project Architecture

The project follows a monolith architecture with the following structure:

```
reader/
├── docker/               # Docker-related files
│   └── Dockerfile        # Main Dockerfile for building the service
├── js/                   # JavaScript source code
│   ├── functions/        # Core application code
│   │   ├── src/          # TypeScript source code
│   │   ├── public/       # Public assets
│   │   └── package.json  # Node.js dependencies
├── py/                   # Python utilities and tests
│   ├── app.py            # Main runner script
│   ├── demo.py           # Demo script
│   └── speedtest.py      # Performance testing script
├── storage/              # Local storage for screenshots (created during setup)
├── config.yaml           # Application configuration
├── setup.sh              # Setup script
├── run.sh                # Application runner script
└── README.md             # This documentation
```

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

## 🛠️ Setup & Installation

### Prerequisites

- Docker
- Node.js v20.x
- Python 3.8+
- npm

### Platform Support

- ✅ **Linux**: Full support with Alpine Linux containers
- ✅ **macOS**: Full support
- ✅ **Windows**: Full support via WSL or native Docker
- ✅ **WSL (Windows Subsystem for Linux)**: Recommended for Windows users

### Enhanced Consolidated Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/postphotos/reader.git
   cd reader
   ```

2. **One-Command Complete Setup:**
   ```bash
   ./run.sh setup --verbose
   ```

   **This automatically handles:**
   - ✅ Docker and Docker Compose validation
   - ✅ Docker image building
   - ✅ Directory structure (storage, logs, js/node_modules)
   - ✅ Python virtual environment with uv
   - ✅ Node.js dependency installation
   - ✅ Default configuration creation
   - ✅ Cross-platform compatibility (Linux/Mac/Windows/WSL)

3. **Start Development Environment:**
   ```bash
   ./run.sh dev
   ```

4. **Verify Installation:**
   Open **http://localhost:3000** in your browser to access the web interface.

### Manual Steps (Alternative)
```bash
# Create directories
mkdir -p storage logs

# Python environment setup
uv venv --clear
source .venv/bin/activate  # Linux/Mac
source .venv/Scripts/activate  # Windows
uv pip install -r py/requirements.txt

# Node.js dependencies
npm install --prefix js/

# Docker setup (already handled by run.sh setup)
```

## � Updating Dependencies

### Python Dependencies

```bash
pip install -r py/requirements.txt
```

### Node.js Dependencies

```bash
cd js/functions
npm install
```

## � Docker Deployment

### Building the Docker Image

```bash
docker build -t reader-app ./docker
```

### Running the Container

```bash
docker run -d --name reader-instance -p 3000:3000 -v $(pwd)/storage:/app/local-storage reader-app
```

For Windows PowerShell, use:
```powershell
docker run -d --name reader-instance -p 3000:3000 -v ${PWD}/storage:/app/local-storage reader-app
```

For Windows Command Prompt, use:
```cmd
docker run -d --name reader-instance -p 3000:3000 -v %cd%/storage:/app/local-storage reader-app
```

For Windows PowerShell, use:
```powershell
docker run -d --name reader-instance -p 3000:3000 -v ${PWD}/storage:/app/local-storage reader-app
```

### Using the Run Script

For a streamlined process:
```bash
chmod +x run.sh
./run.sh
```

## 🧪 Testing

### Complete Test Suite

Run all tests in the pipeline:
```bash
python py/app.py tests
```

### Individual Test Components

```bash
# Run npm tests only
python py/app.py npm

# Run type checking
python py/app.py pyright

# Run the demonstration script
python py/app.py demo

# Run performance tests
python py/app.py speedtest
```

### Test Options

- `--verbose`: Show live output from commands
- `--debug`: Run failed npm tests without timeout for detailed output
- `--force`: Continue pipeline even if some steps fail

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

### Environment Configuration

The development environment supports:
- **Local Storage**: Screenshots saved to `./storage/` (can be set in `config.yaml`)
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
2. the [Reader](https://github.com/intergalacticalvariable/reader) fork from IntergalacticalVariable, which served as the immediate basis for this Docker deployment version.
3. and [Harsh Gupta's original adaptation](https://github.com/hargup/reader) that started this effort.

## 📜 License
This project is licensed under Apache-2.0 same as the original Jina AI Reader project and forks.
