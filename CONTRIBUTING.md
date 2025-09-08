# Contributing to DearReader

Thank you for your interest in contributing to DearReader! 🎉 This project aims to democratize digital content access and enhance digital literacy. Your contributions help make web content more accessible for educational and research purposes.

## 📚 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Areas for Contribution](#areas-for-contribution)
- [Educational Impact](#educational-impact)

## 🤝 Code of Conduct

This project is committed to providing a welcoming and inclusive environment for all contributors. We follow a code of conduct that emphasizes:

- **Respect**: Be respectful of differing viewpoints and experiences
- **Collaboration**: Work together constructively
- **Inclusivity**: Welcome contributions from people of all backgrounds
- **Educational Focus**: Prioritize contributions that enhance digital literacy

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** (for the main application)
- **Python 3.8+** (for utilities and testing)
- **Docker Desktop** (for containerized development)
- **Git** (for version control)

### Quick Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/dearreader.git
   cd dearreader
   ```
3. **Set up the development environment**:
   ```bash
   ./scripts/quickstart.sh
   ```
4. **Start the development server**:
   ```bash
   cd js && npm run serve
   ```
5. **Verify setup** by visiting `http://localhost:3001`

## 🛠️ Development Setup

### Environment Configuration

Create a `.env` file in the project root (optional):

```bash
# Development settings
NODE_ENV=development
PORT=3001

# Performance settings
MAX_CONCURRENT_REQUESTS=10
TIMEOUT_SECONDS=30

# Logging
LOG_LEVEL=info
```

### IDE Setup

We recommend using VS Code with these extensions:
- **TypeScript and JavaScript Language Features** (built-in)
- **ESLint** (for code linting)
- **Prettier** (for code formatting)
- **Python** (for Python utilities)

## 🔄 Development Workflow

### 1. Choose an Issue

- Check the [Issues](../../issues) tab for open tasks
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes

- Write clear, focused commits
- Test your changes thoroughly
- Follow the coding standards below

### 4. Test Your Changes

```bash
# Run JavaScript tests
cd js && npm test

# Run Python utilities
cd py && python demo.py

# Test API endpoints
curl "http://localhost:3001/https://example.com"
```

### 5. Submit a Pull Request

- Push your branch to your fork
- Create a Pull Request with a clear description
- Reference any related issues

## 📝 Coding Standards

### TypeScript/JavaScript

- **Use TypeScript** for all new code
- **Strict type checking** enabled
- **ESLint** configuration must pass
- **Prettier** formatting required

```typescript
// ✅ Good: Clear types and documentation
interface CrawlOptions {
  url: string;
  format: 'markdown' | 'json' | 'html';
  timeout?: number;
}

/**
 * Crawls a webpage and returns formatted content
 */
async function crawlPage(options: CrawlOptions): Promise<string> {
  // Implementation
}
```

### Python

- **Type hints** required for all functions
- **PEP 8** style guide compliance
- **Docstrings** for all public functions
- **pytest** for testing

```python
# ✅ Good: Type hints and documentation
from typing import Dict, Optional

def extract_content(url: str, format: str = "markdown") -> Dict[str, str]:
    """
    Extract content from a URL.

    Args:
        url: The URL to crawl
        format: Output format ('markdown', 'json', 'html')

    Returns:
        Dictionary containing extracted content
    """
    # Implementation
```

### Commit Messages

Follow conventional commit format:

```bash
# ✅ Good commit messages
feat: add PDF extraction support
fix: resolve memory leak in puppeteer service
docs: update API documentation
test: add integration tests for queue system

# ❌ Avoid vague messages
"update code"
"fix bug"
"changes"
```

## 🧪 Testing Guidelines

### Unit Tests

- **Required** for all new features
- **Test both success and error cases**
- **Mock external dependencies**
- **Aim for 80%+ code coverage**

```typescript
// Example test structure
describe('CrawlerService', () => {
  describe('crawlPage()', () => {
    it('should extract content successfully', async () => {
      // Test implementation
    });

    it('should handle network errors gracefully', async () => {
      // Test error handling
    });
  });
});
```

### Integration Tests

- **Test API endpoints** end-to-end
- **Verify data persistence**
- **Test queue functionality**
- **Validate output formats**

### Manual Testing

Before submitting:
1. **Test the web interface** at `http://localhost:3001`
2. **Try different content types** (HTML, PDF, various websites)
3. **Test error scenarios** (invalid URLs, timeouts)
4. **Verify output formats** (JSON, Markdown, HTML)

## 🔄 Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all tests pass**
4. **Update CHANGELOG.md** if applicable

### PR Template

Use this structure for your PR description:

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots of UI changes or test results.

## Related Issues
Fixes #123, Addresses #456
```

### Review Process

1. **Automated checks** will run (linting, tests, build)
2. **Code review** by maintainers
3. **Approval** and merge
4. **Deployment** to staging/production

## 🐛 Issue Reporting

### Bug Reports

When reporting bugs, please include:

- **Clear title** describing the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Environment details** (OS, Node.js version, etc.)
- **Screenshots or logs** if applicable

### Feature Requests

For new features, please provide:

- **Clear description** of the proposed feature
- **Use case** and why it's needed
- **Implementation ideas** if you have them
- **Educational impact** (how it helps digital literacy)

## 🎯 Areas for Contribution

### High Priority

- **📚 Educational Features**: Reading level assessment, study question generation
- **🌐 Content Processing**: Better PDF support, improved HTML parsing
- **⚡ Performance**: Caching, optimization, concurrent processing
- **🛡️ Reliability**: Error handling, retry logic, monitoring

### Medium Priority

- **📊 Analytics**: Usage tracking, performance metrics
- **🎨 UI/UX**: Web interface improvements, accessibility
- **📖 Documentation**: Tutorials, examples, API guides
- **🔧 DevOps**: CI/CD improvements, deployment automation

### Good First Issues

- **🐛 Bug fixes** in existing functionality
- **📝 Documentation** improvements
- **🧪 Additional test coverage**
- **🔧 Script improvements** in the `scripts/` directory

## 📚 Educational Impact

DearReader is more than a technical tool—it's a platform for digital literacy. When contributing, consider:

### How does this help educators?
- **Content Accessibility**: Making web content available for diverse learning needs
- **Research Enablement**: Supporting academic research and analysis
- **Curriculum Integration**: Enabling teachers to incorporate current web content

### How does this help students?
- **Reading Support**: Adapting content for different reading levels
- **Research Skills**: Teaching effective web content evaluation
- **Digital Citizenship**: Understanding responsible web content usage

### How does this advance digital literacy?
- **Content Processing**: Understanding how web content is structured
- **API Design**: Learning about web service architecture
- **Open Source**: Contributing to educational technology

## 🙏 Recognition

Contributors will be:
- **Listed in CONTRIBUTORS.md**
- **Mentioned in release notes**
- **Acknowledged in documentation**
- **Invited to educational impact discussions**

## 📞 Getting Help

- **📧 Issues**: Use GitHub Issues for bugs and features
- **💬 Discussions**: Join conversations about educational applications
- **📖 Documentation**: Check the `/docs` directory for detailed guides
- **🤝 Community**: Connect with other contributors and educators

---

**Thank you for contributing to DearReader!** Your work helps make digital content more accessible and supports digital literacy initiatives worldwide. 🌟