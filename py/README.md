# DearReader Python Client

Python client and utilities for the DearReader API - a web content extraction service that converts web pages to LLM-friendly formats.

## Features

- Extract web content in multiple formats (JSON, Markdown, HTML, Text, Screenshots)
- Simple Python API wrapper
- Command-line interface for testing
- Comprehensive test suite
- Support for PDF extraction

## Installation

```bash
# Using uv (recommended)
uv pip install -e .

# Or using pip
pip install -r requirements.txt
```

## Usage

### Command Line

```bash
# Run demo with default test URLs
uv run demo.py

# Test specific URL
uv run demo.py --url https://example.com

# Test only server connectivity
uv run demo.py --server-only

# Run comprehensive tests
uv run demo.py --test-all

# Test specific format
uv run demo.py --format json --url https://example.com
```

### Python API

```python
from demo import ReaderAPI

# Initialize client
reader = ReaderAPI()

# Get JSON response with metadata
data = reader.get_json("https://example.com")
print(data['data']['title'])

# Get markdown content
markdown = reader.get_markdown("https://example.com")
print(markdown)

# Get screenshot URL
screenshot_url = reader.get_screenshot_url("https://example.com")
print(screenshot_url)
```

## Requirements

- Python 3.8+
- requests
- PyYAML
- psutil

## Development

```bash
# Install development dependencies
uv pip install -e ".[dev]"

# Run tests
uv run pytest tests/
```
