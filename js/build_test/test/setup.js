"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const fs = __importStar(require("fs"));
const puppeteer_js_1 = __importDefault(require("../src/services/puppeteer.js"));
const mocha_1 = require("mocha");
// Aggressive pre-test cleanup
(0, mocha_1.before)(async () => {
    // Kill any existing ESBuild or test processes before starting
    try {
        const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
        execSync('pkill -9 -f "esbuild.*service" 2>/dev/null || true', { stdio: 'ignore' });
        execSync('pkill -9 -f "mocha.*test" 2>/dev/null || true', { stdio: 'ignore' });
        execSync('pkill -9 -f "tsx.*test" 2>/dev/null || true', { stdio: 'ignore' });
        console.log('🧹 Pre-test cleanup: killed existing test processes');
    }
    catch (e) {
        // Ignore cleanup errors
    }
});
// Global test setup
// This file runs before all tests and sets up the testing environment
// Configure Puppeteer for Chromium with better WSL support
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
// Try multiple Chromium paths for different environments
const chromiumPaths = [
    '/usr/bin/chromium-browser', // WSL/Debian/Ubuntu
    '/usr/bin/chromium', // Alpine Linux
    '/usr/bin/google-chrome', // Some Linux distributions
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
    }
    catch (error) {
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
    let processMonitor;
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
(0, mocha_1.after)(async () => {
    await puppeteer_js_1.default.close();
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
//# sourceMappingURL=setup.js.map