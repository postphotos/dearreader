// Lightweight DOMMatrix polyfill for pdfjs in Node test environment
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: any) {
      if (typeof init === 'string') {
        // ignore matrix string
      } else if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init.concat([1,0,0,1,0,0]).slice(0,6);
      } else if (init && typeof init === 'object') {
        Object.assign(this, init);
      }
    }
    multiply() { return this; }
    multiplySelf() { return this; }
    translateSelf() { return this; }
    scaleSelf() { return this; }
    toString() { return '' + this.a + ',' + this.b + ',' + this.c + ',' + this.d + ',' + this.e + ',' + this.f; }
  }
  (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
}

// Polyfill for Promise.withResolvers (Node.js 18+)
if (typeof (globalThis as any).Promise.withResolvers === 'undefined') {
  (globalThis as any).Promise.withResolvers = function<T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
  };
}

// Configure pdfjs-dist for testing
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';

import 'reflect-metadata';
import * as fs from 'fs';

import puppeteerControl from '../src/services/puppeteer.js';
import { after, before } from 'mocha';


// Type declarations for Node.js globals
declare const process: any;

// Aggressive pre-test cleanup
before(async () => {
  // Kill any existing ESBuild or test processes before starting
  try {
    const { execSync } = await import('child_process');
    execSync('pkill -9 -f "esbuild.*service" 2>/dev/null || true', { stdio: 'ignore' });
    execSync('pkill -9 -f "mocha.*test" 2>/dev/null || true', { stdio: 'ignore' });
    execSync('pkill -9 -f "tsx.*test" 2>/dev/null || true', { stdio: 'ignore' });
    console.log('🧹 Pre-test cleanup: killed existing test processes');
  } catch (e) {
    // Ignore cleanup errors
  }
});

// Global test setup
// This file runs before all tests and sets up the testing environment

// Configure Puppeteer for Chromium with better WSL support
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';

// Try multiple Chromium paths for different environments
const chromiumPaths = [
  '/usr/bin/chromium-browser',  // WSL/Debian/Ubuntu
  '/usr/bin/chromium',          // Alpine Linux
  '/usr/bin/google-chrome',     // Some Linux distributions
  '/usr/bin/google-chrome-stable', // Chrome stable
  process.env.PUPPETEER_EXECUTABLE_PATH // Environment override
].filter(Boolean);

// Find the first available Chromium executable
let chromiumFound = false;
for (const path of chromiumPaths) {
  try {
    if (path && fs.statSync(path).isFile()) {
      process.env.PUPPETEER_EXECUTABLE_PATH = path;
      console.log(`✅ Using Chromium at: ${path}`);
      chromiumFound = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!chromiumFound) {
  console.warn('⚠️  Chromium not found. Tests will use mock implementation.');
  console.warn('   To install Chromium:');
  console.warn('   - WSL/Debian: sudo apt-get install chromium-browser');
  console.warn('   - Alpine: apk add chromium');

  // Set environment variable to indicate mock should be used
  process.env.USE_PUPPETEER_MOCK = 'true';
}

// Additional Puppeteer options for headless environments
process.env.PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu'
].join(' ');

// Set headless mode for testing
process.env.PUPPETEER_HEADLESS = 'true';

// Enhanced monitoring for test environments
if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
  let processMonitor: NodeJS.Timeout;

  // Monitor for hanging processes during tests
  const monitorProcesses = () => {
    const handleCount = process._getActiveHandles().length;
    const requestCount = process._getActiveRequests().length;

    if (handleCount > 50 || requestCount > 20) {
      console.warn(`⚠️  High resource usage detected: ${handleCount} handles, ${requestCount} requests`);
    }
  };

  processMonitor = setInterval(monitorProcesses, 30000);

  // Cleanup monitor on exit
  process.on('beforeExit', () => {
    if (processMonitor) {
      clearInterval(processMonitor);
    }
  });
}

// You can add other global test setup here if needed

// Global after hook to close puppeteer
after(async () => {
  await puppeteerControl.close();

  // Only do minimal cleanup in smart test mode
  if (process.env.SMART_TEST_CLEANUP === 'true') {
    console.log('✅ Smart cleanup mode: letting script handle cleanup');
    return;
  }

  // Force exit in test environments to prevent hanging (only when not in smart mode)
  if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
    setTimeout(() => {
      console.log('⚠️  Forcing process exit after test cleanup');
      process.exit(0);
    }, 100);
  }
});