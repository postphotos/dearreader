#!/usr/bin/env node

// Simple test runner for client-side JavaScript files
// Uses jsdom to simulate browser environment for testing

import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup jsdom environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
  <title>Test Environment</title>
</head>
<body>
  <div id="test-container"></div>
</body>
</html>
`, {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Setup global browser APIs
global.window = dom.window;
global.document = dom.window.document;

// Make navigator writable
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  writable: true,
  configurable: true
});

global.console = console;

// Mock clipboard API
Object.defineProperty(global.navigator, 'clipboard', {
  value: {
    writeText: async (text) => Promise.resolve()
  },
  writable: true
});

// Mock performance API
global.performance = {
  getEntriesByType: () => [{
    loadEventEnd: 1000,
    fetchStart: 0
  }]
};

// Load the JavaScript files
const mainJs = readFileSync(join(__dirname, 'main.js'), 'utf8');
const appJs = readFileSync(join(__dirname, 'app.js'), 'utf8');

// Execute the scripts in the jsdom environment
try {
  // Execute scripts directly in the global context
  dom.window.eval(mainJs);
  dom.window.eval(appJs);

  console.log('✅ JavaScript files loaded successfully');

  // Basic functionality tests
  console.log('\n🧪 Running basic functionality tests...');

  // Test Utils object exists
  if (typeof dom.window.Utils !== 'undefined') {
    console.log('✅ Utils object loaded');

    // Test copyToClipboard function exists
    if (typeof dom.window.Utils.copyToClipboard === 'function') {
      console.log('✅ copyToClipboard function available');
    } else {
      console.log('❌ copyToClipboard function missing');
    }

    // Test showStatus function exists
    if (typeof dom.window.Utils.showStatus === 'function') {
      console.log('✅ showStatus function available');
    } else {
      console.log('❌ showStatus function missing');
    }

    // Test formatFileSize function
    if (typeof dom.window.Utils.formatFileSize === 'function') {
      const result = dom.window.Utils.formatFileSize(1024);
      if (result === '1 KB') {
        console.log('✅ formatFileSize function working');
      } else {
        console.log('❌ formatFileSize function not working correctly');
      }
    } else {
      console.log('❌ formatFileSize function missing');
    }
  } else {
    console.log('❌ Utils object not loaded');
  }

  // Test DearReaderApp class exists
  if (typeof dom.window.DearReaderApp !== 'undefined') {
    console.log('✅ DearReaderApp class loaded');

    // Test getInstance method
    if (typeof dom.window.DearReaderApp.getInstance === 'function') {
      console.log('✅ getInstance method available');
    } else {
      console.log('❌ getInstance method missing');
    }
  } else {
    console.log('❌ DearReaderApp class not loaded');
  }

  console.log('\n🎉 Basic tests completed!');

} catch (error) {
  console.error('❌ Error loading or testing JavaScript files:', error.message);
  process.exit(1);
}