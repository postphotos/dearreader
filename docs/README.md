# DearReader Documentation

## 🔍 Project Overview

DearReader is a **local web crawler server** that converts web pages to LLM-friendly formats. Built as a completely local solution without cloud dependencies.

**Single-Purpose Focus**: This tool is designed specifically for converting individual webpages in a queue - NOT for storing or processing entire websites. For full-site crawling, indexing, or bulk processing, you'll need other specialized tools. No LLM processing happens directly here; this is purely a content extraction and formatting service.

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
- **[Architecture](./architecture.md)** - System design and components

### Advanced Features
- **[Docker Setup](./DOCKER_README.md)** - Docker development environment
- **[Migration Guide](./migration.md)** - Migrating from old scripts
- **[Development Progress](./CLINE_INPROGRESS.md)** - Current development status

### Development & Maintenance
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

---

## 🚀 Getting Started

1. **Quick Setup**: Run `./scripts/quickstart.sh`
2. **Start Development**: Run `cd js && npm run serve`
3. **Access Web UI**: Open `http://localhost:3001`
4. **API Testing**: Try `curl 'http://localhost:3001/https://www.ala.org'`

---

## 📋 Current Status

**Version**: 0.0.1  
**Last Updated**: 2025-09-08
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
- What else should we do? Build it, or tell us! 

---

## 🤝 Contributing

We want to enhance digital literacy and information understanding! This project addresses critical needs in information accessibility. Contributions that enhance crawling capability, improve performance, or expand educational applications are particularly welcome. 

See our [contributing guide](./contributing.md) for detailed information on how to get involved.

---

## 📄 License

Apache License 2.0 - See main repository for complete license terms.
