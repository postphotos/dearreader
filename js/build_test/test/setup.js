
// Polyfill for DOMMatrix (needed for pdfjs-dist)
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    constructor(init) {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
      if (typeof init === 'string') {
        // ignore matrix string
      }
      else if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init.concat([1, 0, 0, 1, 0, 0]).slice(0, 6);
      }
      else if (init && typeof init === 'object') {
        Object.assign(this, init);
      }
    }
    multiply() { return this; }
    multiplySelf() { return this; }
    translateSelf() { return this; }
    scaleSelf() { return this; }
    toString() { return '' + this.a + ',' + this.b + ',' + this.c + ',' + this.d + ',' + this.e + ',' + this.f; }
  }
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

// Polyfill for Promise.withResolvers (Node.js 18+)
if (typeof globalThis.Promise.withResolvers === 'undefined') {
  globalThis.Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrixPolyfill {
    constructor(init) {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
      if (typeof init === "string") {
      } else if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init.concat([1, 0, 0, 1, 0, 0]).slice(0, 6);
      } else if (init && typeof init === "object") {
        Object.assign(this, init);
      }
    }
    multiply() {
      return this;
    }
    multiplySelf() {
      return this;
    }
    translateSelf() {
      return this;
    }
    scaleSelf() {
      return this;
    }
    toString() {
      return "" + this.a + "," + this.b + "," + this.c + "," + this.d + "," + this.e + "," + this.f;
    }
  }
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}
if (typeof globalThis.Promise.withResolvers === "undefined") {
  globalThis.Promise.withResolvers = function() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
import "./polyfills.js";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.mjs";
import "reflect-metadata";
import "reflect-metadata";
import * as fs from "fs";
import puppeteerControl from "../src/services/puppeteer.js";
import { after, before } from "mocha";
before(async () => {
  try {
    const { execSync } = await import("child_process");
    execSync('pkill -9 -f "esbuild.*service" 2>/dev/null || true', { stdio: "ignore" });
    execSync('pkill -9 -f "mocha.*test" 2>/dev/null || true', { stdio: "ignore" });
    execSync('pkill -9 -f "tsx.*test" 2>/dev/null || true', { stdio: "ignore" });
    console.log("\u{1F9F9} Pre-test cleanup: killed existing test processes");
  } catch (e) {
  }
});
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true";
const chromiumPaths = [
  "/usr/bin/chromium-browser",
  // WSL/Debian/Ubuntu
  "/usr/bin/chromium",
  // Alpine Linux
  "/usr/bin/google-chrome",
  // Some Linux distributions
  "/usr/bin/google-chrome-stable",
  // Chrome stable
  process.env.PUPPETEER_EXECUTABLE_PATH
  // Environment override
].filter(Boolean);
let chromiumFound = false;
for (const path of chromiumPaths) {
  try {
    if (path && fs.statSync(path).isFile()) {
      process.env.PUPPETEER_EXECUTABLE_PATH = path;
      console.log(`\u2705 Using Chromium at: ${path}`);
      chromiumFound = true;
      break;
    }
  } catch (error) {
  }
}
if (!chromiumFound) {
  console.warn("\u26A0\uFE0F  Chromium not found. Tests will use mock implementation.");
  console.warn("   To install Chromium:");
  console.warn("   - WSL/Debian: sudo apt-get install chromium-browser");
  console.warn("   - Alpine: apk add chromium");
  process.env.USE_PUPPETEER_MOCK = "true";
}
process.env.PUPPETEER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-accelerated-2d-canvas",
  "--no-first-run",
  "--no-zygote",
  "--disable-gpu"
].join(" ");
process.env.PUPPETEER_HEADLESS = "true";
if (process.env.NODE_ENV === "test" || process.env.CI === "true") {
  let processMonitor;
  const monitorProcesses = () => {
    const handleCount = process._getActiveHandles().length;
    const requestCount = process._getActiveRequests().length;
    if (handleCount > 50 || requestCount > 20) {
      console.warn(`\u26A0\uFE0F  High resource usage detected: ${handleCount} handles, ${requestCount} requests`);
    }
  };
  processMonitor = setInterval(monitorProcesses, 3e4);
  process.on("beforeExit", () => {
    if (processMonitor) {
      clearInterval(processMonitor);
    }
  });
}
after(async () => {
  await puppeteerControl.close();
  if (process.env.SMART_TEST_CLEANUP === "true") {
    console.log("\u2705 Smart cleanup mode: letting script handle cleanup");
    return;
  }
  if (process.env.NODE_ENV === "test" || process.env.CI === "true") {
    setTimeout(() => {
      console.log("\u26A0\uFE0F  Forcing process exit after test cleanup");
      process.exit(0);
    }, 100);
  }
});
//# sourceMappingURL=setup.js.map
