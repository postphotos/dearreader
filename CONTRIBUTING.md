# Contributing to DearReader

We welcome contributions to DearReader! This document will guide you through the process of setting up your development environment and contributing to the project.

## Prerequisites

Before you begin, make sure you have the following installed:

- [uv](https://docs.astral.sh/uv/) - Python package and project manager
- [Docker](https://www.docker.com/) - For containerization and testing
- [Node.js](https://nodejs.org/) (v20+) - For the backend functions
- [Git](https://git-scm.com/) - Version control

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/postphotos/reader.git
cd reader
```

### 2. Set Up Python Environment

DearReader uses `uv` for Python dependency management:

```bash
# Install Python dependencies
uv sync

# Activate the virtual environment
source .venv/bin/activate  # On Unix/macOS
# or
.venv\Scripts\activate     # On Windows
```

### 3. Set Up Backend Environment

```bash
cd backend/functions
npm install
cd ../..
```

### 4. Environment Variables

Create a `.env` file in the root directory:

```bash
# Optional: Set to 'false' to disable robots.txt checking
RESPECT_ROBOTS_TXT=true

# Optional: Configure proxy if needed
# https_proxy=http://127.0.0.1:7890
# http_proxy=http://127.0.0.1:7890
# all_proxy=socks5://127.0.0.1:7890
```

### 5. Test Your Setup

```bash
# Run all tests to ensure everything is working
python3 app.py npm
python3 app.py demo
python3 app.py speedtest
```

## Development Workflow

### Running the Development Pipeline

DearReader includes a comprehensive development pipeline:

```bash
# Run individual steps
python3 app.py npm          # TypeScript tests
python3 app.py docker       # Build and test Docker container
python3 app.py pyright      # Python type checking
python3 app.py demo         # Test with educational URLs
python3 app.py speedtest    # Performance testing

# Run full pipeline
python3 app.py all
```

### Backend Development

Start the development server:

```bash
cd backend/functions

# Watch mode for TypeScript compilation
npm run build:watch

# In another terminal, start the emulator
npm run emu:debug
```

The server will be available at `http://localhost:3000`.

### Testing

We maintain comprehensive test coverage:

- **TypeScript Tests**: Mocha-based unit tests for the crawler
- **Python Tests**: Integration tests using `demo.py`
- **Performance Tests**: Load testing with `speedtest.py`
- **Docker Tests**: Container integration tests

### Code Style

- **TypeScript**: Follow existing patterns, use proper typing
- **Python**: Follow PEP 8, use type hints where appropriate
- **Documentation**: Update docs for new features and changes

## Contributing Guidelines

### Pull Requests

1. **Fork the repository** and create a feature branch:
   ``bashgit checkout -b feature/your-feature-name
2. **Make your changes** following the coding standards

3. **Test thoroughly**:
```bash
python3 app.py all  # Run full test suite
```

4. **Update documentation** if needed

5. **Submit a pull request** with:
   - Clear description of changes
   - Link to any related issues
   - Screenshots/examples if applicable

### Issue Reporting

When reporting issues, please include:

- **Environment details** (OS, Python version, Node.js version)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Relevant logs** from the application

### Feature Requests

We welcome feature requests! Please:

- **Check existing issues** to avoid duplicates
- **Describe the use case** and why it would be beneficial
- **Provide examples** of how the feature would work

## Architecture Overview

DearReader consists of several key components:

### Core Components

- **Crawler Engine** (`backend/functions/src/cloud-functions/crawler.ts`)
  - Main crawling logic with Puppeteer and JSDOM support
  - PDF extraction capabilities
  - Robots.txt compliance checking

- **Content Processing** (`backend/functions/src/utils/`)
  - Markdown conversion
  - Content cleaning and extraction
  - Image and link processing

- **Services** (`backend/functions/src/services/`)
  - PDF extraction service
  - Robots.txt checker
  - Queue manager for batch processing

### Testing Infrastructure

- **Speed Testing** (`speedtest.py`)
  - Concurrent API testing
  - Performance analytics
  - Educational URL dataset testing

- **Integration Testing** (`demo.py`)
  - End-to-end workflow testing
  - Educational content validation

### Docker Support

- **Multi-stage builds** for optimization
- **Development and production** configurations
- **Health checking** and monitoring

## Development Tips

### Debugging

1. **Enable verbose logging**:
   ```bash
   python3 app.py demo --verbose
   ```

2. **Check container logs**:
   ```bash
   docker logs reader-app
   ```

3. **Use browser dev tools** for frontend debugging

### Performance Optimization

- Use the speedtest tool to identify bottlenecks
- Monitor token usage and response times
- Test with various educational URLs

### Adding New Features

1. **Plan the architecture** - discuss major changes in issues first
2. **Write tests first** - TDD approach is encouraged
3. **Update documentation** - keep README and docs current
4. **Consider backwards compatibility** - avoid breaking changes

## Educational Focus

DearReader is designed with educational content in mind. When contributing:

- **Test with educational URLs** (libraries, schools, educational organizations)
- **Respect robots.txt** and site policies
- **Focus on accessibility** and inclusive design
- **Consider performance** for resource-constrained environments

## Getting Help

- **Discord/Slack**: [Link to community chat if available]
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: Check the README.md and inline code comments
- **Examples**: Look at the test files for usage patterns

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- **Be respectful** in all interactions
- **Focus on constructive feedback**
- **Help newcomers** get started
- **Report any issues** to the maintainers

## License

By contributing to DearReader, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to DearReader! Together, we're building tools that make web content more accessible for educational purposes. 🚀📚
