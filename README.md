# 🚀 DearReader: A New Chapter in Web Content Extraction

**Parse ANY crawlable URL into clean markdown.**

### Table of Contents

1.  [Architectural Philosophy](#-architectural-philosophy)
2.  [Why DearReader?](#-why-dearreader)
3.  [From Prose to Pipelines: Workflow Examples](#-from-prose-to-pipelines-what-you-can-build)
4.  [🚀 Quick Start: A One-Act Play](#-quick-start-a-one-act-play)
5.  [📖 The Table of Contents: API Usage](#-the-table-of-contents-api-usage)
6.  [🛠️ The Workshop: Manual Setup & Development](#-the-workshop-manual-setup--development)
7.  [✍️ Author's Intent: Architectural Scope](#️-authors-intent-architectural-scope)
8.  [🙏 Acknowledgments](#-acknowledgments)
9.  [📜 License](#-license)

***

### 🏛️ Architectural Philosophy

`DearReader` embraces the UNIX philosophy: do one thing and do it exceptionally well. Instead of a single, complex tool, we provide a robust building block for a modern, modular stack.

```
+--------------------------+         +--------------------------+         +--------------------------+
|      ORCHESTRATOR        |         |      DEARREADER API      |         |     YOUR DESTINATION     |
| (e.g., N8n, Python script|  ----->  | (Runs Locally via Docker)|  ----->  | (e.g., Vector DB,        |
|  , Zapier, Message Queue)|         | - Takes a single URL     |         |  PostgreSQL, Filesystem)|
| - Manages URL queue      |  <HTTP> | - Returns clean JSON     |  <Data> | - Stores structured data |
| - Handles retry logic    |  <Req.> |   /Markdown/HTML         |         | - Powers your AI agent   |
| - Calls DearReader API   |         |                          |         |                          |
+--------------------------+         +--------------------------+         +--------------------------+
```

`DearReader` is intentionally designed to do one thing perfectly: **process a single URL** and do it consistently. You manage the "what" and "when" (the list of URLs, the schedule). `DearReader` perfects the "how" (the extraction).

There is a built-in queue within the API runner, but the overall responsibility of managing URL queues, implementing retry logic, and performing recursive site crawling is delegated to your chosen orchestrator (like a Python script or N8n). This gives you maximum flexibility and power.

### ✨ Why DearReader?

`DearReader` is a powerful, locally-hosted microservice that handles the most difficult part of web data extraction: running a headless browser, parsing messy HTML, and extracting clean, structured content. If you have the compute, you might as well use it! 

By decoupling the **parsing engine** (`DearReader`) from the **orchestration logic** (your script, N8n, etc.), you can build faster, more reliable, and easier-to-maintain data pipelines. You provide a URL, however you get it; It returns LLM-friendly JSON, Markdown, or HTML, including metadata, links, and more.

*   🏠 **Make a private archive for yourself.** Runs 100% locally in Docker. No data ever leaves your infrastructure. No API keys, no rate limits, no third-party dependencies. Your data is your own first edition.
*   🧐 **Read between the `<div>`s.** `DearReader` uses a battle-tested engine to extract the core story, intelligently ignoring ads, pop-ups, sidebars, and navigational cruft.
*   ⚡️ **Work lightning fast.** Optimized Debian-based Docker image for high performance and excellent Chromium compatibility. Turn the page on slow, brittle scrapers.
*   📚 **Multi-Genre Input AND Output.** Parses HTML and PDFs, and get content as you want: clean Markdown, richly structured JSON with metadata, simplified HTML, or plain text.
*   📸 **Archival Snapshots.** Capture full-page or viewport-sized screenshots of any URL for archival or visual analysis.

[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://docker.com)
[![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Python](https://img.shields.io/badge/python-3670A0?style=flat&logo=python&logoColor=ffdd54)](https://python.org)

Unlike the previous versions, we selected Alpine linux to reduce OS overhead and greatly tweaked the Puppeteer performance to make a fast, reliable crawl output.

### 📚 Ideas of what to build with DearReader

`DearReader` is a universal translator for the web. Here are a few ideas you might try:

#### 1. For the Digital Humanist & Academic Researcher
A researcher needs to analyze 500 news articles about a topic (e.g. reviews on the newest season of your favorite binge TV drama). Instead of weeks of manual copy-pasting, a Python script feeds the URLs to `DearReader`. It gets back perfectly structured JSON with clean content for text analysis and all the metadata (`author`, `publication date`) for automatic citation and cataloging.

And now? You can run more experiements, more quickly.

#### 2. For the SEO & Web Migration Specialist
An agency is migrating a 10,000-page legacy website for a history non-profit organization. The staging site is missing something critical: Perhaps categories or related posts. With an Orchestrator, you can point a script at the old sitemap, and for each URL, `DearReader` returns clean JSON containing the title, description, metadata, and Markdown content. That can be parsed and fed directly into the new CMS's import API, or transformation steps with an LLM can be broguht along the way. 

And now? A multi-month nightmare becomes a single, repeatable script.

#### 3. For the Educator & Teacher
A teacher wants students to analyze an article about a topic like Book Ban Month, but each live site they visit is a minefield of ads and distracting comments. They gather an assortment of URLS and use A simple internal tool to make structured `GET` requests to the local `DearReader` instance.

And now? They've got clean, ad-free Markdown versions of articles - perfect for classroom use.

#### 4. For the AI Developer Building a RAG System
A developer is building a "chat with your docs" agent. A generic scraper would pollute the vector database with irrelevant navigation links. Instead, a simple workflow sends each documentation URL to `DearReader`, which returns only the core article content.

And now? A vastly more accurate and efficient RAG system.

### 🚀 Quick Start

Get your instance running in under a minute.

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/dearreader.git
cd dearreader

# 2. Run the one-click setup and start script
./scripts/quickstart.sh
```

**That's it.** The API is now live at `http://localhost:3001`.

**Test your new engine:**
```bash
# Request a URL and get back structured JSON
curl -H "Accept: application/json" "http://localhost:3001/https://www.ala.org"

# Test PDF extraction
curl "http://localhost:3001/json/https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
```

**Run PDF functionality tests:**
```bash
# Test PDF extraction directly
cd js && node pdf-demo.js

# Run comprehensive PDF tests
cd js && node test-pdf-comprehensive.js
```

### 📖 The Table of Contents: API Usage

Interact with `DearReader` via simple `GET` requests.

**Base Endpoint:** `http://localhost:3001/{URL_TO_PROCESS}`

You can control the response format using HTTP headers or dedicated URL paths.

#### 1. Default (Markdown)
Returns clean, readable Markdown.
```bash
curl "http://localhost:3001/https://bookshop.org/"
```

#### 2. JSON (Recommended)
Returns structured data with metadata, links, and content. The most powerful format.
```bash
# Use the Accept header
curl -H "Accept: application/json" "http://localhost:3001/https://www.rif.org/why-reading-matters"

# Or use the dedicated path
curl "http://localhost:3001/json/https://www.rif.org/why-reading-matters"
```
**JSON Response Structure:**
```json
{
  "code": 200,
  "status": 20000,
  "data": {
    "title": "Page Title",
    "description": "Page description",
    "url": "https://www.ala.org/page/...",
    "content": "Main content in clean markdown format...",
    "links": { "https://.../link1": "Link Text 1", ... },
    "images": { "https://.../image1.jpg": "Alt text", ... },
    "metadata": {
      "lang": "en",
      "og:title": "Open Graph title",
      "article:author": "Author Name"
    }
  }
}
```

#### 3. Other Formats (via `X-Respond-With` Header)
-   `html`: Returns cleaned, simplified HTML.
-   `text`: Returns plain text with no formatting.
-   `screenshot`: Returns a JSON object with the local path to a viewport-sized screenshot.
-   `pageshot`: Returns a JSON object with the local path to a full-page screenshot.

```bash
# Get simplified HTML
curl -H "X-Respond-With: html" "http://localhost:3001/https://thepalaceproject.org/"

# Get a full-page screenshot
curl -H "X-Respond-With: pageshot" "http://localhost:3001/https://www.ala.org"
# Response: {"code":200, "data":"/app/local-storage/screenshots/pageshot_....png"}
# Note: This is the path *inside the Docker container*. To access it, you must
# expose the `storage` volume or build a static file server in front of it.
```

#### PDF Support
`DearReader` can extract text content from PDF files automatically. Simply provide a PDF URL:

```bash
# Extract text from a PDF
curl "http://localhost:3001/https://example.com/document.pdf"

# Get PDF content as JSON
curl "http://localhost:3001/json/https://example.com/document.pdf"
```

**PDF Features:**
- ✅ Automatic PDF detection and processing
- ✅ Text extraction from all pages
- ✅ Support for various PDF formats
- ✅ Configurable processing limits (50MB max, 100 pages)
- ✅ Clean text output without formatting artifacts

### 🛠️ The Workshop: Manual Setup & Development

[*Contributions welcome!*](./docs/CONTRIBUTING.md)

> **📝 A Note for Windows Users**
> We strongly recommend using **WSL2** for the best experience. If running commands from PowerShell or `cmd`, you may need to prefix them with `bash -c "..."` if the scripts fail to execute directly (e.g., `bash -c "./dearreader dev"`).

#### Manual Setup
```bash
# 1. Verify your system meets the requirements
./scripts/verify.sh

# 2. Setup the environment (install dependencies, etc.)
./dearreader setup

# 3. Start the development server with hot-reloading
./dearreader dev
```

#### The `dearreader` CLI
Our unified CLI simplifies development and management.
-   `./dearreader setup`: Initialize the environment.
-   `./dearreader dev`: Start the dev server.
-   `./dearreader run prod`: Run the production container.
-   `./dearreader test [js|python|all]`: Run tests.
-   `./dearreader status`: Show container status.
-   `./dearreader logs`: View service logs.
-   `./dearreader clean`: Remove containers and stored data.

#### 🔍 Reading Between the Lines: Troubleshooting
-   **Permission denied:** Run `sudo chmod +x scripts/*.sh dearreader` to make scripts executable.
-   **Docker not running:** Ensure Docker Desktop is started or run `sudo systemctl start docker` on Linux.
-   **Port 3001 in use:** Stop the conflicting service or change the port in `docker-compose.yml`.
-   **WSL issues:** Make sure Docker Desktop's WSL integration is enabled for your distribution.

### 🙏 Acknowledgments

This project is an evolution of the work of others. 
1. Our story begins with the original [Jina AI Reader project](https://github.com/jina-ai/reader)
2. Wnd was adapted by [Harsh Gupta](https://github.com/hargup/reader) into a Docker container, and
3. A fork by [IntergalacticalVariable](https://github.com/intergalacticalvariable/reader) that gave inspiration to this version.

We are deeply grateful for their foundational contributions.

### 📜 License

This project is licensed under **Apache-2.0**, inheriting the license from the original Jina AI Reader project and its forks.