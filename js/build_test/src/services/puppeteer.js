
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

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};
import os from "os";
import fs from "fs";
import { container, singleton } from "tsyringe";
import { AsyncService, Defer, marshalErrorLike, delay, maxConcurrency } from "civkit";
import { Logger } from "../shared/index.js";
import { createRequire } from "module";
const nodeRequire = createRequire(import.meta.url);
const fetch = globalThis.fetch;
let puppeteerCore;
let addExtra;
if (process.env.USE_PUPPETEER_MOCK === "true") {
  console.log("\u{1F527} Using Puppeteer mock implementation");
  const mockPath = new URL("../../test/mock-puppeteer.js", import.meta.url).href;
  const { mockPuppeteer, mockAddExtra } = await import(mockPath);
  puppeteerCore = mockPuppeteer;
  addExtra = mockAddExtra;
} else {
  puppeteerCore = await import("puppeteer");
  const puppeteerExtra = await import("puppeteer-extra");
  addExtra = puppeteerExtra.addExtra;
}
import puppeteerPageProxy from "puppeteer-extra-plugin-page-proxy";
import { ServiceCrashedError } from "../shared/errors.js";
import { parse as tldParse } from "tldts";
import puppeteerStealth from "puppeteer-extra-plugin-stealth";
const validateCookie = (cookie) => {
  const requiredFields = ["name", "value"];
  for (const field of requiredFields) {
    if (!(field in cookie)) {
      throw new Error(`Cookie is missing required field: ${field}`);
    }
  }
};
const READABILITY_JS = fs.readFileSync(nodeRequire.resolve("@mozilla/readability/Readability.js"), "utf-8");
const puppeteer = addExtra(puppeteerCore);
puppeteer.use(puppeteerStealth());
puppeteer.use(puppeteerPageProxy({
  interceptResolutionPriority: 1
}));
const SCRIPT_TO_INJECT_INTO_FRAME = `
${READABILITY_JS}

function briefImgs(elem) {
    const imageTags = Array.from((elem || document).querySelectorAll('img[src],img[data-src]'));

    return imageTags.map((x)=> {
        let linkPreferredSrc = x.src;
        if (linkPreferredSrc.startsWith('data:')) {
            if (typeof x.dataset?.src === 'string' && !x.dataset.src.startsWith('data:')) {
                linkPreferredSrc = x.dataset.src;
            }
        }

        return {
            src: new URL(linkPreferredSrc, document.baseURI).toString(),
            loaded: x.complete,
            width: x.width,
            height: x.height,
            naturalWidth: x.naturalWidth,
            naturalHeight: x.naturalHeight,
            alt: x.alt || x.title,
        };
    });
}
function briefPDFs() {
    const pdfTags = Array.from(document.querySelectorAll('embed[type="application/pdf"]'));

    return pdfTags.map((x)=> {
        return x.src === 'about:blank' ? document.location.href : x.src;
    });
}
function getMaxDepthAndCountUsingTreeWalker(root) {
  let maxDepth = 0;
  let currentDepth = 0;
  let elementCount = 0;

  const treeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    (node) => {
      const nodeName = node.nodeName.toLowerCase();
      return (nodeName === 'svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
    false
  );

  while (true) {
    maxDepth = Math.max(maxDepth, currentDepth);
    elementCount++; // Increment the count for the current node

    if (treeWalker.firstChild()) {
      currentDepth++;
    } else {
      while (!treeWalker.nextSibling() && currentDepth > 0) {
        treeWalker.parentNode();
        currentDepth--;
      }

      if (currentDepth <= 0) {
        break;
      }
    }
  }

  return {
    maxDepth: maxDepth + 1,
    elementCount: elementCount
  };
}

function giveSnapshot(stopActiveSnapshot) {
    if (stopActiveSnapshot) {
        window.haltSnapshot = true;
    }
    let parsed;
    try {
        parsed = new Readability(document.cloneNode(true)).parse();
    } catch (err) {
        void 0;
    }
    const domAnalysis = getMaxDepthAndCountUsingTreeWalker(document.documentElement);
    const r = {
        title: document.title,
        href: document.location.href,
        html: document.documentElement?.outerHTML,
        text: document.body?.innerText,
        parsed: parsed,
        imgs: [],
        pdfs: briefPDFs(),
        maxElemDepth: domAnalysis.maxDepth,
        elemCount: domAnalysis.elementCount,
    };
    if (document.baseURI !== r.href) {
        r.rebase = document.baseURI;
    }
    if (parsed && parsed.content) {
        const elem = document.createElement('div');
        elem.innerHTML = parsed.content;
        r.imgs = briefImgs(elem);
    } else {
        const allImgs = briefImgs();
        if (allImgs.length === 1) {
            r.imgs = allImgs;
        }
    }

    return r;
}
`;
let PuppeteerControl = class extends AsyncService {
  constructor() {
    super();
    this._sn = 0;
    this.logger = new Logger("PuppeteerControl");
    // Resource tracking for leak prevention
    this.startTime = Date.now();
    this.maxLifetime = 10 * 60 * 1e3;
    // 10 minutes max lifetime in tests
    this.isClosing = false;
    // New queue-based system
    this.requestQueue = [];
    this.pagePool = [];
    this.maxConcurrentPages = 10;
    // Configurable max concurrent pages
    this.currentActivePages = 0;
    this.processing = false;
    this.PAGE_IDLE_TIMEOUT = 60 * 1e3;
    // 1 minute for idle pages
    this.MAX_PAGE_LIFETIME = 5 * 60 * 1e3;
    // 5 minutes max lifetime
    this.CLEANUP_INTERVAL = 30 * 1e3;
    // 30 seconds cleanup interval
    this.__loadedPage = [];
    this.finalizerMap = /* @__PURE__ */ new WeakMap();
    this.snMap = /* @__PURE__ */ new WeakMap();
    this.livePages = /* @__PURE__ */ new Set();
    this.lastPageCreatedAt = 0;
    this.circuitBreakerHosts = /* @__PURE__ */ new Set();
    // Map to store snapshot handlers for each page
    this.snapshotHandlers = /* @__PURE__ */ new WeakMap();
    this.setMaxListeners(2 * Math.floor(os.totalmem() / (256 * 1024 * 1024)) + 1);
    this.on("crippled", () => {
      this.__loadedPage.length = 0;
      this.livePages.clear();
      this.pagePool.forEach((mp) => this.destroyManagedPage(mp));
      this.pagePool.length = 0;
      this.currentActivePages = 0;
      this.requestQueue.forEach((req) => req.reject(new ServiceCrashedError({ message: "Browser crashed" })));
      this.requestQueue.length = 0;
    });
    ``;
    this.__cleanupInterval = setInterval(() => this.cleanupIdlePages(), 3e4);
    if (process.env.NODE_ENV === "test" || process.env.CI === "true") {
      this.__emergencyCleanupInterval = setInterval(() => this.emergencyCleanup(), 6e4);
      this.__resourceMonitorInterval = setInterval(() => this.monitorResources(), 3e4);
    }
  }
  /**
   * Emergency cleanup for memory leak prevention
   */
  emergencyCleanup() {
    const now = Date.now();
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    this.logger.info("Emergency cleanup check", {
      heapUsedMB,
      rssMB,
      livePages: this.livePages.size,
      poolPages: this.pagePool.length,
      queueLength: this.requestQueue.length
    });
    if (heapUsedMB > 512 || rssMB > 1024) {
      this.logger.warn("High memory usage detected, forcing cleanup", {
        heapUsedMB,
        rssMB
      });
      const idlePages = this.pagePool.filter((mp) => !mp.inUse);
      idlePages.forEach((mp) => this.destroyManagedPage(mp));
      if (this.pagePool.length > 5) {
        const oldestPages = this.pagePool.sort((a, b) => a.createdAt - b.createdAt).slice(0, Math.floor(this.pagePool.length / 2));
        oldestPages.forEach((mp) => {
          this.logger.warn(`Force closing page ${mp.sn} due to high memory usage`);
          this.destroyManagedPage(mp);
        });
      }
      if (global.gc) {
        global.gc();
        this.logger.info("Forced garbage collection");
      }
    }
    if (process.env.NODE_ENV === "test" && now - this.startTime > this.maxLifetime) {
      this.logger.warn("Test environment max lifetime exceeded, triggering restart");
      this.emit("restart-needed");
    }
  }
  /**
   * Monitor resources and log warnings
   */
  monitorResources() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);
    const stats = {
      heap: {
        used: heapUsedMB,
        total: heapTotalMB,
        percent: Math.round(heapUsedMB / heapTotalMB * 100)
      },
      rss: rssMB,
      external: externalMB,
      pages: {
        live: this.livePages.size,
        pool: this.pagePool.length,
        active: this.currentActivePages,
        queue: this.requestQueue.length
      },
      uptime: Math.round(process.uptime())
    };
    if (stats.heap.percent > 80 || stats.rss > 1024 || stats.pages.live > 20) {
      this.logger.warn("Resource usage warning", stats);
    } else {
      this.logger.debug("Resource monitoring", stats);
    }
  }
  briefPages() {
    this.logger.info(`Status: ${this.livePages.size} pages alive: ${Array.from(this.livePages).map((x) => this.snMap.get(x)).sort().join(", ")}; ${this.__loadedPage.length} idle pages: ${this.__loadedPage.map((x) => this.snMap.get(x)).sort().join(", ")}`);
    this.logger.info(`Pool status: ${this.pagePool.length} total pages, ${this.currentActivePages} active, ${this.requestQueue.length} queued`);
  }
  async createManagedPage() {
    const sn = this._sn++;
    let context;
    let page;
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }
    try {
      context = this.browser.defaultBrowserContext();
      page = await context.newPage();
    } catch (error) {
      this.logger.error(`Failed to create page ${sn}:`, { error: marshalErrorLike(error) });
      throw error;
    }
    const managedPage = {
      page,
      context,
      sn,
      createdAt: Date.now(),
      inUse: false,
      lastUsed: Date.now()
    };
    this.snMap.set(page, sn);
    this.logger.info(`Page ${sn} created.`);
    await this.setupPage(page, sn);
    return managedPage;
  }
  async setupPage(page, sn, options) {
    const preparations = [];
    preparations.push(page.setBypassCSP(true));
    const viewport = {
      width: options?.viewportWidth || 1024,
      height: options?.viewportHeight || 1024
    };
    preparations.push(page.setViewport(viewport));
    preparations.push(page.exposeFunction("reportSnapshot", (snapshot) => {
      if (snapshot.href === "about:blank") {
        return;
      }
      const handler = this.snapshotHandlers.get(page);
      if (handler) {
        handler(snapshot);
      }
    }));
    preparations.push(page.evaluateOnNewDocument(SCRIPT_TO_INJECT_INTO_FRAME));
    preparations.push(page.setRequestInterception(true));
    await Promise.all(preparations);
    await page.goto("about:blank", { waitUntil: "domcontentloaded" });
    this.setupPageRequestHandling(page, sn);
    this.livePages.add(page);
    this.lastPageCreatedAt = Date.now();
  }
  setupPageRequestHandling(page, sn) {
    const domainSet = /* @__PURE__ */ new Set();
    let reqCounter = 0;
    let t0;
    let halt = false;
    page.on("request", (req) => {
      reqCounter++;
      if (halt) {
        return req.abort("blockedbyclient", 1e3);
      }
      t0 ??= Date.now();
      const requestUrl = req.url();
      if (!requestUrl.startsWith("http:") && !requestUrl.startsWith("https:") && requestUrl !== "about:blank") {
        return req.abort("blockedbyclient", 1e3);
      }
      try {
        const tldParsed = tldParse(requestUrl);
        if (tldParsed.domain) domainSet.add(tldParsed.domain);
      } catch (error) {
        this.logger.warn(`Failed to parse TLD for URL: ${requestUrl}. Using fallback method.`);
        const simpleDomain = this.extractDomain(requestUrl);
        if (simpleDomain) domainSet.add(simpleDomain);
      }
      const parsedUrl = new URL(requestUrl);
      if (this.circuitBreakerHosts.has(parsedUrl.hostname.toLowerCase())) {
        page.emit("abuse", { url: requestUrl, page, sn, reason: `Abusive request: ${requestUrl}` });
        return req.abort("blockedbyclient", 1e3);
      }
      if (parsedUrl.hostname === "localhost" || parsedUrl.hostname.startsWith("127.")) {
        page.emit("abuse", { url: requestUrl, page, sn, reason: `Suspicious action: Request to localhost: ${requestUrl}` });
        return req.abort("blockedbyclient", 1e3);
      }
      const dt = Math.ceil((Date.now() - t0) / 1e3);
      const rps = reqCounter / dt;
      if (reqCounter > 1e3) {
        if (rps > 60 || reqCounter > 2e3) {
          page.emit("abuse", { url: requestUrl, page, sn, reason: `DDoS attack suspected: Too many requests` });
          halt = true;
          return req.abort("blockedbyclient", 1e3);
        }
      }
      if (domainSet.size > 200) {
        page.emit("abuse", { url: requestUrl, page, sn, reason: `DDoS attack suspected: Too many domains` });
        halt = true;
        return req.abort("blockedbyclient", 1e3);
      }
      req.continue().catch(() => {
      });
    });
  }
  destroyManagedPage(managedPage) {
    return new Promise((resolve) => {
      const { page, sn } = managedPage;
      if (this.finalizerMap.has(page)) {
        clearTimeout(this.finalizerMap.get(page));
        this.finalizerMap.delete(page);
      }
      this.logger.info(`Destroying managed page ${sn}`);
      this.livePages.delete(page);
      this.snMap.delete(page);
      const index = this.pagePool.indexOf(managedPage);
      if (index !== -1) {
        this.pagePool.splice(index, 1);
      }
      if (managedPage.inUse) {
        this.currentActivePages--;
      }
      if (page.isClosed()) {
        resolve();
        return;
      }
      Promise.race([
        (async () => {
          try {
            const context = page.browserContext();
            await page.close();
            if (context.pages && (await context.pages()).length === 0) {
              await context.close();
            }
          } catch (error) {
            this.logger.warn(`Error closing page ${sn}:`, { error: marshalErrorLike(error) });
          }
        })(),
        delay(5e3)
      ]).finally(() => {
        resolve();
      });
    });
  }
  cleanupIdlePages() {
    const now = Date.now();
    const idlePages = this.pagePool.filter(
      (mp) => !mp.inUse && now - mp.lastUsed > this.PAGE_IDLE_TIMEOUT
    );
    const expiredPages = this.pagePool.filter(
      (mp) => now - mp.createdAt > this.MAX_PAGE_LIFETIME
    );
    const pagesToCleanup = [.../* @__PURE__ */ new Set([...idlePages, ...expiredPages])];
    if (pagesToCleanup.length > 0) {
      this.logger.info(`Cleaning up ${pagesToCleanup.length} pages`, {
        idle: idlePages.length,
        expired: expiredPages.length
      });
      pagesToCleanup.forEach((mp) => {
        this.logger.debug(`Cleaning up page ${mp.sn}`, {
          idle: !mp.inUse && now - mp.lastUsed > this.PAGE_IDLE_TIMEOUT,
          expired: now - mp.createdAt > this.MAX_PAGE_LIFETIME,
          inUse: mp.inUse
        });
        this.destroyManagedPage(mp);
      });
    }
  }
  processQueue() {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }
    this.processing = true;
    this.requestQueue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });
    while (this.requestQueue.length > 0 && this.currentActivePages < this.maxConcurrentPages) {
      const request = this.requestQueue.shift();
      let availablePage = this.pagePool.find((mp) => !mp.inUse);
      if (availablePage) {
        availablePage.inUse = true;
        availablePage.lastUsed = Date.now();
        this.currentActivePages++;
        request.resolve(availablePage.page);
      } else if (this.pagePool.length < this.maxConcurrentPages) {
        this.createManagedPage().then((managedPage) => {
          this.pagePool.push(managedPage);
          managedPage.inUse = true;
          this.currentActivePages++;
          request.resolve(managedPage.page);
        }).catch((error) => {
          request.reject(error);
        });
      } else {
        this.requestQueue.unshift(request);
        break;
      }
    }
    this.processing = false;
  }
  async init() {
    if (this.__healthCheckInterval) {
      clearInterval(this.__healthCheckInterval);
      this.__healthCheckInterval = void 0;
    }
    if (this.__cleanupInterval) {
      clearInterval(this.__cleanupInterval);
      this.__cleanupInterval = void 0;
    }
    await this.dependencyReady();
    if (this.browser) {
      if (this.browser.connected) {
        await this.browser.close();
      } else {
        this.browser.process()?.kill("SIGKILL");
      }
    }
    const args = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--headless=new",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-sync",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-component-update"
    ];
    const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_EXECUTABLE || void 0;
    const launchOpts = {
      args,
      timeout: 1e4,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false
    };
    if (execPath) launchOpts.executablePath = execPath;
    this.browser = await puppeteer.launch(launchOpts).catch((err) => {
      this.logger.error(`Browser launch failed.`, { err });
      process.nextTick(() => this.emit("error", err));
      return Promise.reject(err);
    });
    this.browser.once("disconnected", () => {
      this.logger.warn(`Browser disconnected`);
      this.emit("crippled");
      process.nextTick(() => this.serviceReady());
    });
    this.logger.info(`Browser launched: ${this.browser.process()?.pid}`);
    this.emit("ready");
    this.__healthCheckInterval = setInterval(() => this.healthCheck(), 3e4);
    this.newPage().then((r) => this.__loadedPage.push(r));
  }
  async healthCheck() {
    if (Date.now() - this.lastPageCreatedAt <= 1e4) {
      this.briefPages();
      return;
    }
    const healthyPage = await this.newPage().catch((err) => {
      this.logger.warn(`Health check failed`, { err: marshalErrorLike(err) });
      return null;
    });
    if (healthyPage) {
      this.__loadedPage.push(healthyPage);
      if (this.__loadedPage.length > 3) {
        this.ditchPage(this.__loadedPage.shift());
      }
      this.briefPages();
      return;
    }
    this.logger.warn(`Trying to clean up...`);
    this.browser.process()?.kill("SIGKILL");
    Reflect.deleteProperty(this, "browser");
    this.emit("crippled");
    this.logger.warn(`Browser killed`);
  }
  // FIX: Corrected the structure of this method. It was previously malformed.
  extractDomain(url) {
    try {
      const { hostname } = new URL(url);
      const parts = hostname.split(".");
      return parts.length > 1 ? parts.slice(-2).join(".") : hostname;
    } catch (error) {
      this.logger.warn(`Failed to extract domain from URL: ${url}. Error: ${error.message}`);
      return null;
    }
  }
  // FIX: This method was previously inside `extractDomain` due to a copy-paste error.
  // It's now a proper class method, intended for creating pre-warmed/health-check pages.
  async newPage() {
    await this.serviceReady();
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }
    const dedicatedContext = this.browser.defaultBrowserContext();
    const sn = this._sn++;
    const page = await dedicatedContext.newPage();
    const preparations = [];
    preparations.push(page.setBypassCSP(true));
    preparations.push(page.setViewport({ width: 1024, height: 1024 }));
    preparations.push(page.exposeFunction("reportSnapshot", (snapshot) => {
      if (snapshot.href === "about:blank") return;
      const handler = this.snapshotHandlers.get(page);
      if (handler) handler(snapshot);
    }));
    preparations.push(page.evaluateOnNewDocument(SCRIPT_TO_INJECT_INTO_FRAME));
    preparations.push(page.setRequestInterception(true));
    await Promise.all(preparations);
    await page.goto("about:blank", { waitUntil: "domcontentloaded" });
    this.setupPageRequestHandling(page, sn);
    this.snMap.set(page, sn);
    this.logger.info(`Page ${sn} created (for pre-warming/health-check).`);
    this.lastPageCreatedAt = Date.now();
    this.livePages.add(page);
    return page;
  }
  async getNextPage(priority = 0) {
    return new Promise((resolve, reject) => {
      const request = { resolve, reject, priority, timestamp: Date.now() };
      this.requestQueue.push(request);
      const timeout = setTimeout(() => {
        const index = this.requestQueue.indexOf(request);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error("Page request timeout"));
        }
      }, 3e4);
      request.resolve = (page) => {
        clearTimeout(timeout);
        resolve(page);
      };
      request.reject = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
      this.processQueue();
    });
  }
  releasePage(page) {
    const managedPage = this.pagePool.find((mp) => mp.page === page);
    if (managedPage && managedPage.inUse) {
      managedPage.inUse = false;
      managedPage.lastUsed = Date.now();
      this.currentActivePages--;
      this.processQueue();
    }
  }
  async ditchPage(page) {
    if (this.finalizerMap.has(page)) {
      clearTimeout(this.finalizerMap.get(page));
      this.finalizerMap.delete(page);
    }
    if (page.isClosed()) return;
    const sn = this.snMap.get(page);
    this.logger.info(`Ditching page ${sn}`);
    this.livePages.delete(page);
    try {
      await Promise.race([page.close(), delay(5e3)]);
    } catch (err) {
      this.logger.error(`Failed to ditch page ${sn}`, { err: marshalErrorLike(err) });
    }
  }
  async *scrape(parsedUrl, options = {}) {
    const url = parsedUrl.toString();
    let page = null;
    try {
      page = await this.getNextPage(1);
      const sn = this.snMap.get(page) ?? -1;
      this.logger.info(`Page ${sn}: Scraping ${url}`);
      if (options.viewportWidth || options.viewportHeight) {
        const viewport = {
          width: options.viewportWidth || 1024,
          height: options.viewportHeight || 1024
        };
        await page.setViewport(viewport);
        this.logger.info(`Page ${sn}: Set viewport to ${viewport.width}x${viewport.height}`);
      }
      if (options.proxyUrl && page.useProxy) {
        await page.useProxy(options.proxyUrl);
      }
      if (options.cookies) {
        try {
          options.cookies.forEach(validateCookie);
          await page.setCookie(...options.cookies);
        } catch (error) {
          this.logger.error(`Page ${sn}: Error setting cookies for ${url}`, { error, cookies: options.cookies });
          throw error;
        }
      }
      if (options.overrideUserAgent) {
        await page.setUserAgent(options.overrideUserAgent);
      }
      const nextSnapshotDeferred = Defer();
      const crippleListener = () => nextSnapshotDeferred.reject(new ServiceCrashedError({ message: `Browser crashed` }));
      this.once("crippled", crippleListener);
      nextSnapshotDeferred.promise.finally(() => this.off("crippled", crippleListener));
      let lastSnapshot;
      const hdl = (s) => {
        if (s?.maxElemDepth && s.maxElemDepth > 256) return;
        if (s?.elemCount && s.elemCount > 1e4) return;
        lastSnapshot = s;
        nextSnapshotDeferred.resolve(s);
      };
      this.snapshotHandlers.set(page, hdl);
      const timeout = options.timeoutMs || 3e4;
      const gotoPromise = page.goto(url, { waitUntil: "load", timeout }).catch((err) => {
        if (err.name === "TimeoutError" || err.message?.includes("ERR_NAME_NOT_RESOLVED")) {
          this.logger.warn(`Page ${sn}: Navigation to ${url} failed`, { err: marshalErrorLike(err) });
          return;
        }
        throw err;
      });
      const waitForPromise = options.waitForSelector ? page.waitForSelector(
        Array.isArray(options.waitForSelector) ? options.waitForSelector.join(", ") : options.waitForSelector,
        { timeout }
      ).catch((err) => {
        this.logger.warn(`Page ${sn}: waitForSelector failed for ${url}`, { err: marshalErrorLike(err) });
      }) : Promise.resolve();
      await Promise.all([gotoPromise, waitForPromise]);
      await Promise.race([nextSnapshotDeferred.promise, delay(options.minIntervalMs || 1e3)]);
      const finalSnapshot = lastSnapshot || await page.evaluate("giveSnapshot()").catch(() => null);
      if (finalSnapshot) {
        this.logger.info(`Page ${sn}: Snapshot of ${url} done`, { title: finalSnapshot.title || "Untitled" });
        yield finalSnapshot;
      } else {
        this.logger.warn(`Page ${sn}: No snapshot available for ${url}, trying screenshot.`);
        const screenshot = await page.screenshot().catch(() => void 0);
        const title = await page.title().catch(() => "Scraping Failed");
        yield {
          title,
          href: url,
          html: "",
          text: "",
          screenshot,
          error: "No snapshot available, screenshot taken as fallback."
        };
      }
    } catch (error) {
      this.logger.error(`Scraping failed for ${url}:`, { error: marshalErrorLike(error) });
      yield {
        title: "Error: Scraping failed",
        href: url,
        html: "",
        text: "",
        error: error.message || "An unknown error occurred during scraping."
      };
    } finally {
      if (page) {
        this.snapshotHandlers.delete(page);
        if (options.proxyUrl && page.useProxy) {
          await page.useProxy(null);
        }
        this.releasePage(page);
      }
    }
  }
  async salvage(url, page) {
    this.logger.info(`Salvaging ${url}`);
    const googleArchiveUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
    const resp = await fetch(googleArchiveUrl, {
      headers: { "User-Agent": `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)` }
    });
    if (!resp.ok) {
      this.logger.warn(`No salvation found for url: ${url}`, { status: resp.status });
      return null;
    }
    await page.goto(googleArchiveUrl, { waitUntil: "load", timeout: 15e3 }).catch((err) => {
      this.logger.warn(`Page salvation did not fully succeed.`, { err: marshalErrorLike(err) });
    });
    this.logger.info(`Salvation completed.`);
    return true;
  }
  async snapshotChildFrames(page) {
    const childFrames = page.mainFrame().childFrames();
    const results = await Promise.all(childFrames.map(async (frame) => {
      const frameUrl = frame.url();
      if (!frameUrl || frameUrl === "about:blank") return void 0;
      try {
        await frame.evaluate(SCRIPT_TO_INJECT_INTO_FRAME);
        return await frame.evaluate(`giveSnapshot()`);
      } catch (err) {
        this.logger.warn(`Failed to snapshot child frame ${frameUrl}`, { err });
        return void 0;
      }
    }));
    return results.filter((r) => Boolean(r));
  }
  async crawl(url, options) {
    const iterator = this.scrape(url, options);
    for await (const snapshot of iterator) {
      if (snapshot) {
        return snapshot;
      }
    }
    return void 0;
  }
  async close() {
    this.isClosing = true;
    if (this.__healthCheckInterval) {
      clearInterval(this.__healthCheckInterval);
      this.__healthCheckInterval = void 0;
    }
    if (this.__cleanupInterval) {
      clearInterval(this.__cleanupInterval);
      this.__cleanupInterval = void 0;
    }
    if (this.__emergencyCleanupInterval) {
      clearInterval(this.__emergencyCleanupInterval);
      this.__emergencyCleanupInterval = void 0;
    }
    if (this.__resourceMonitorInterval) {
      clearInterval(this.__resourceMonitorInterval);
      this.__resourceMonitorInterval = void 0;
    }
    this.requestQueue.forEach((req) => {
      try {
        req.reject(new Error("PuppeteerControl is closing"));
      } catch (e) {
      }
    });
    this.requestQueue.length = 0;
    for (const page of this.livePages) {
      if (this.finalizerMap.has(page)) {
        const timeout = this.finalizerMap.get(page);
        if (timeout) {
          clearTimeout(timeout);
        }
        this.finalizerMap.delete(page);
      }
    }
    for (const managedPage of this.pagePool) {
      try {
        if (!managedPage.page.isClosed()) {
          await managedPage.page.close();
        }
      } catch (e) {
      }
    }
    this.pagePool.length = 0;
    for (const page of this.__loadedPage) {
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch (e) {
      }
    }
    this.__loadedPage.length = 0;
    if (this.browser && this.browser.connected) {
      await this.browser.close();
    }
    this.livePages.clear();
    this.circuitBreakerHosts.clear();
    this.isClosing = true;
  }
};
__decorateClass([
  maxConcurrency(1)
], PuppeteerControl.prototype, "healthCheck", 1);
PuppeteerControl = __decorateClass([
  singleton()
], PuppeteerControl);
const puppeteerControl = container.resolve(PuppeteerControl);
var puppeteer_default = puppeteerControl;
export {
  PuppeteerControl,
  puppeteer_default as default
};
//# sourceMappingURL=puppeteer.js.map
