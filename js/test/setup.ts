import 'reflect-metadata';
import * as fs from 'fs';

import puppeteerControl from '../src/services/puppeteer.js';
import { after } from 'mocha';


// Type declarations for Node.js globals
declare const process: any;

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

// You can add other global test setup here if needed

// Global after hook to close puppeteer
after(async () => {
  await puppeteerControl.close();
});
