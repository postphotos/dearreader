# 📚 DearReader: Enhanced Local Crawler-as-a-Service

**Dear reader, this Crawler-as-a-Service is for you!** This is a feature-enhanced fork of the excellent work done by [intergalacticalvariable/reader](https://github.com/intergalacticalvariable/reader), based on the open source version [Jina AI Reader](https://github.com/jina-ai/reader).

Inspired by the prolific reading culture of the Victorian Era, DearReader allows you to parse any webpage into a clean, LLM-friendly format, right on your local machine. It builds upon the original [Jina AI's Reader](https://github.com/jina-ai/reader) and is optimized for local deployment, creating a robust, easy-to-use tool for your agent and RAG systems—at no cost.

---

### 🎯 What DearReader Does

DearReader converts any URL into structured, easy-to-process input for Large Language Models. Simply make a request to `http://127.0.0.1:3000/https://google.com` and receive clean Markdown, JSON, or plain text.

### 🌟 Enhanced Features

* 🏠 **Run Locally with Docker**: Uses an optimized Debian base image for better compatibility.
* 🔑 **No API Keys (or Library Card) Required**: Works out of the box with zero configuration.
* 🖼️ **Local Screenshots**: Saves screenshots to your local machine instead of the cloud.
* 📥 **Downloadable Screenshots**: Provides direct download URLs for saved images.
* 🌐 **LLM-Friendly Formatting**: Converts web content into structured JSON, clean Markdown, and more.
* 🧪 **Comprehensive Test Suite**: Ensures reliability and simplifies development.
* 🔗 **Enhanced Link & Metadata Parsing**: Extracts more detailed information from web pages.
* � **PDF Processing Support**: Configurable PDF parsing with file size limits and metadata extraction.
* �📊 **Jina.ai API Parity**: Offers a familiar API for those accustomed to Jina's cloud service.
* 🛠️ **Complete Dev Environment**: Includes a full setup with Firebase Functions for easy development.

### ⚠️ Limitations

* 📄 Currently does not support parsing PDF files.

---

## 🚀 Quick Start (Recommended)

Get up and running in minutes with the unified test runner, which handles the entire development pipeline.

**1. Clone the repository:**
```bash
git clone https://github.com/postphotos/reader.git #<-- Assuming this is your repo name
cd reader
```

**2. Install Python dependencies:**
```bash
# Recommended: Use uv
uv pip install -r requirements.txt

# Or use pip
pip install -r requirements.txt
```

**3. Run the complete pipeline:**
This single command will run tests, build and start the Docker container, perform type checking, and run a demo script.
```bash
python3 app.py all --verbose
```

Once complete, the service will be running at `http://127.0.0.1:3000`.

---

## 📖 Usage & API Specification

Once the Docker container is running, you can access the DearReader API.

**Base Endpoint**: `http://127.0.0.1:3000/{URL_TO_READ}`

### Response Formats

#### 1. JSON (Default) ✒️
Returns structured data including content, metadata, links, and images.

```bash
# Default request
curl 'http://127.0.0.1:3000/https://example.com'

# Explicit request
curl -H "Accept: application/json" 'http://127.0.0.1:3000/https://example.com'
```

#### 2. Markdown 📝
Returns the main content as clean, readable Markdown.

```bash
curl -H "Accept: text/plain" 'http://127.0.0.1:3000/https://example.com'
```

#### 3. HTML 🌐
Returns the cleaned HTML of the page.

```bash
curl -H "X-Respond-With: html" 'http://127.0.0.1:3000/https://example.com'
```

#### 4. Plain Text 📄
Returns the raw text content from the page body.

```bash
curl -H "X-Respond-With: text" 'http://127.0.0.1:3000/https://example.com'
```

#### 5. Screenshot 📸
Returns a URL to a locally saved screenshot of the viewport or the full page.

```bash
# Screen-sized screenshot
curl -H "X-Respond-With: screenshot" 'http://127.0.0.1:3000/https://example.com'

# Full-page screenshot
curl -H "X-Respond-With: pageshot" 'http://127.0.0.1:3000/https://example.com'
```

---

## 🐳 Docker Deployment

If you prefer a manual setup, you can build and run the Docker container yourself.

**1. Clone the repository:**
```bash
git clone https://github.com/postphotos/reader.git #<-- Assuming this is your repo name
cd reader
```

**2. Configure settings (optional):**
Edit the `config.yaml` file in the root directory to customize settings:

```yaml
# DearReader Configuration
# Place this file in the root directory of your project

# Robots.txt compliance settings
robots:
  respect_robots_txt: true

# PDF parsing settings
pdf:
  enable_parsing: true
  max_file_size_mb: 50
  processing_timeout_seconds: 30
  enable_ocr: false
  extract_metadata: true
  max_pages: 100

# Domain/TLD settings
domain:
  allow_all_tlds: false

# Storage settings
storage:
  local_directory: "./storage"
  max_file_age_days: 7

# Development settings
development:
  debug: false
  cors_enabled: true
```

**Note:** The `./storage` directory will be created automatically on first run if it doesn't exist, and is already added to `.gitignore`.

**3. Build the Docker image:**
```bash
docker build -t reader-app .
```

**4. Run the container:**
This command maps port 3000 and mounts a local `storage` directory for screenshots.
```bash
docker run -d -p 3000:3000 -v ./storage:/app/local-storage reader-app
```

**5. Or use Docker Compose (recommended):**
```bash
docker-compose up --build -d
```

**6. Or use the unified pipeline:**
```bash
# Using manual Docker commands
python3 app.py all --verbose

# Using Docker Compose
python3 app.py docker-compose
```

---

## 🛠️ For Developers & Contributors

This fork includes a comprehensive development environment.

### Prerequisites

* Node.js 20
* Python 3.8+
* Docker
* `uv` (Recommended Python package manager)

<details>
<summary><b>Click to see Development & Testing Commands</b></summary>

The `app.py` script simplifies the entire development workflow.

### Unified Runner Commands

```bash
# Run the complete pipeline (tests → docker → type checks → demo)
python3 app.py all --verbose

# Quick smoke test (npm + basic validation)
python3 app.py basic --verbose
```

### Individual Steps

```bash
# Run just TypeScript tests
python3 app.py npm --verbose

# Build and run Docker container
python3 app.py docker --verbose

# Run Python type checking
python3 app.py pyright --verbose

# Test API endpoints with the demo script
python3 app.py demo --verbose
```

### Manual Development Setup

If you prefer a traditional workflow:

1. **Install Node Dependencies:**
```bash
cd backend/functions
npm install
```
2. **Build & Run Tests:**
```bash
npm run build
npm test
```

3. **Start Development Server:**
```bash
# Run the Express server directly
node build/server.js

# Or, use the Firebase emulator
npm run serve
```

### Project Structure

```bash
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
</details>

---

## ⚖️ A Note on Responsible Reading

When using this tool, you are responsible for your actions. Web crawling is legal in most countries for legitimate purposes, but please read responsibly:

1. **Respect `robots.txt`**: Always honor the limits and rules set by a website.
2. **Be Gentle**: Spread your requests over time to avoid overwhelming servers.
3. **Respect Copyright**: Adhere to all local and international laws regarding the content you access.

## 🙏 Acknowledgements

This project has evolved through the contributions of several developers. Special thanks to:

* **[intergalacticalvariable](https://github.com/intergalacticalvariable)** for building the last version that this fork is based on, which introduced many of the key enhancements.
* The original **[Jina AI Reader project](https://github.com/jina-ai/reader)**, which provided the foundational technology for this tool.
* **[Harsh Gupta's adaptation](https://github.com/hargup/reader)**, an earlier fork in the project's history.

## 📜 License

This project is licensed under the **Apache-2.0 License**, the same as the original Jina AI Reader project.
