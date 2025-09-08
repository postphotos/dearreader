# DearReader Documentation

## 🔍 Project Overview

DearReader is a **local web crawler server** that converts web pages to LLM-friendly formats. Built as a completely local solution without cloud dependencies.

**Key Features:**
- 🚀 **Local WebScraping**: Extract content from URLs locally
- 📄 **Multiple Output Formats**: JSON, Markdown, HTML, Text, Screenshots
- ⚡ **Queue-Based Processing**: Handle multiple scraping requests
- 🐳 **Docker Containerized**: Easy deployment with Docker
- 📊 **Performance Monitoring**: Built-in metrics and logging
- 👨‍🔬 **Tested Implementation**: Comprehensive test suite

## 📚 Documentation Structure

This documentation covers all aspects of DearReader's functionality, setup, and usage.

### Core Documentation
- **[Setup Guide](./setup.md)** - Complete installation and configuration
- **[API Reference](./api.md)** - Complete API documentation with examples
- **[Web Interface](./web-interface.md)** - Guide to web UI at localhost:3000
- **[Configuration](./configuration.md)** - All configuration options

### Advanced Features
- **[Queues & Processing](./queues.md)** - How the crawler queue system works
- **[Screenshots](./screenshots.md)** - Screenshot capture functionality
- **[Performance](./performance.md)** - Optimization and monitoring

### Development & Maintenance
- **[Command Reference](./commands.md)** - All command-line operations
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions
- **[Testing](./testing.md)** - Running and writing tests
- **[Contributing](./contributing.md)** - Development setup and contribution guidelines

### Educational Context
- **[Literacy Integration](./literacy.md)** - How this tool supports reading literacy
- **[Book Ban Challenges](./book-bans.md)** - Addressing challenges of book access
- **[Educational Use Cases](./education.md)** - Classroom and research applications

---

## 🚀 Getting Started

1. **Quick Setup**: Run `./run.sh setup --verbose`
2. **Start Development**: Run `./dev-app` or `./run.sh dev`
3. **Access Web UI**: Open `http://localhost:3000`
4. **API Testing**: Try `curl 'http://localhost:3000/https://example.com'`

---

## 📋 Current Status

**Version**: 1.0.0  
**Last Updated**: 2025-09-07  
**Environment**: Local-only, Docker-based, Python/Node.js  

### ✅ Completed Features
- Local crawler server setup
- Express.js API with multiple endpoints
- Queue management system
- Cross-platform shell script consolidation
- Docker containerization
- Comprehensive testing framework

### 🔄 In Development
- Enhanced web interface consistency
- Complete documentation suite
- Performance optimization
- Advanced queuing features

---

## 🤝 Contributing

This project addresses critical needs in digital literacy and information accessibility. Contributions that enhance crawling capability, improve performance, or expand educational applications are particularly welcome.

See our [contributing guide](./contributing.md) for detailed information on how to get involved.

---

## 📄 License

Apache License 2.0 - See main repository for complete license terms.
