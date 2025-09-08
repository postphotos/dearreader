# DearReader Public Files Testing

This directory contains tests for the client-side JavaScript and HTML files in the `js/public/` directory.

## Test Files

- `tests.js` - Comprehensive unit tests using Jest-style syntax
- `test-runner.js` - Node.js-based test runner using jsdom for browser simulation
- `test-page.html` - Interactive browser-based test page for manual testing

## Running Tests

### Option 1: Node.js Test Runner (Automated)

```bash
cd js/public
node test-runner.js
```

This will run basic functionality tests for:
- Utils object and its methods
- DearReaderApp class
- Clipboard operations
- File size formatting
- Basic DOM interactions

### Option 2: Browser Test Page (Manual)

1. Start the DearReader server
2. Navigate to `http://localhost:3000/test-page.html`
3. Click the test buttons to verify functionality
4. Test keyboard shortcuts (Ctrl+K, Escape)
5. Resize browser to test responsive design

### Option 3: Full Test Suite (if Jest is available)

```bash
cd js/public
npm test tests.js
```

## Test Coverage

### Utils Module (`main.js`)
- ✅ `copyToClipboard()` - Clipboard operations with fallback
- ✅ `showStatus()` - Status message display
- ✅ `formatFileSize()` - File size formatting
- ✅ `debounce()` - Function debouncing
- ✅ `isInViewport()` - Element visibility detection

### DearReaderApp Class (`app.js`)
- ✅ Keyboard shortcuts (Ctrl+K, Escape)
- ✅ Error handling (global error events)
- ✅ Performance monitoring
- ✅ Singleton pattern implementation

### HTML/CSS Integration
- ✅ Semantic HTML structure
- ✅ Accessibility features
- ✅ Responsive design
- ✅ CSS variable usage
- ✅ Mobile-first approach

## Browser Compatibility

Tests are designed to work in:
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

- Tests use minimal DOM manipulation
- No external dependencies required
- Lightweight setup for CI/CD integration
- Focus on core functionality validation

## Adding New Tests

1. For unit tests, add to `tests.js`
2. For integration tests, modify `test-runner.js`
3. For manual tests, update `test-page.html`

## CI/CD Integration

The test runner can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Test Public Files
  run: cd js/public && node test-runner.js
```