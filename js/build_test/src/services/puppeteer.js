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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PuppeteerControl = void 0;
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const tsyringe_1 = require("tsyringe");
const civkit_1 = require("civkit");
const index_js_1 = require("../shared/index.js");
const module_1 = require("module");
const require = (0, module_1.createRequire)(import.meta.url);
// Import fetch conditionally - use native fetch in Node 18+
const fetch = globalThis.fetch;
let puppeteerCore;
let addExtra;
if (process.env.USE_PUPPETEER_MOCK === 'true') {
    console.log('🔧 Using Puppeteer mock implementation');
    const { mockPuppeteer, mockAddExtra } = await Promise.resolve().then(() => __importStar(require('../../test/mock-puppeteer.js')));
    puppeteerCore = mockPuppeteer;
    addExtra = mockAddExtra;
}
else {
    puppeteerCore = await Promise.resolve().then(() => __importStar(require('puppeteer')));
    const puppeteerExtra = await Promise.resolve().then(() => __importStar(require('puppeteer-extra')));
    addExtra = puppeteerExtra.addExtra;
}
const puppeteer_extra_plugin_page_proxy_1 = __importDefault(require("puppeteer-extra-plugin-page-proxy"));
const errors_js_1 = require("../shared/errors.js");
const tldts_1 = require("tldts");
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
// Add this new function for cookie validation
const validateCookie = (cookie) => {
    const requiredFields = ['name', 'value'];
    for (const field of requiredFields) {
        if (!(field in cookie)) {
            throw new Error(`Cookie is missing required field: ${field}`);
        }
    }
};
const READABILITY_JS = fs_1.default.readFileSync(require.resolve('@mozilla/readability/Readability.js'), 'utf-8');
const puppeteer = addExtra(puppeteerCore);
puppeteer.use((0, puppeteer_extra_plugin_stealth_1.default)());
puppeteer.use((0, puppeteer_extra_plugin_page_proxy_1.default)({
    interceptResolutionPriority: 1,
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
let PuppeteerControl = class PuppeteerControl extends civkit_1.AsyncService {
    constructor() {
        super();
        this._sn = 0;
        this.logger = new index_js_1.Logger('PuppeteerControl'); // Renamed for clarity
        // Resource tracking for leak prevention
        this.startTime = Date.now();
        this.maxLifetime = 10 * 60 * 1000; // 10 minutes max lifetime in tests
        this.isClosing = false;
        // New queue-based system
        this.requestQueue = [];
        this.pagePool = [];
        this.maxConcurrentPages = 10; // Configurable max concurrent pages
        this.currentActivePages = 0;
        this.processing = false;
        this.PAGE_IDLE_TIMEOUT = 60 * 1000; // 1 minute for idle pages
        this.__loadedPage = [];
        this.finalizerMap = new WeakMap();
        this.snMap = new WeakMap();
        this.livePages = new Set();
        this.lastPageCreatedAt = 0;
        this.circuitBreakerHosts = new Set();
        // Map to store snapshot handlers for each page
        this.snapshotHandlers = new WeakMap();
        this.setMaxListeners(2 * Math.floor(os_1.default.totalmem() / (256 * 1024 * 1024)) + 1);
        this.on('crippled', () => {
            this.__loadedPage.length = 0;
            this.livePages.clear();
            this.pagePool.forEach(mp => this.destroyManagedPage(mp));
            this.pagePool.length = 0;
            this.currentActivePages = 0;
            // Reject all queued requests
            this.requestQueue.forEach(req => req.reject(new errors_js_1.ServiceCrashedError({ message: 'Browser crashed' })));
            this.requestQueue.length = 0;
        });
        ``;
        // Start cleanup interval
        this.__cleanupInterval = setInterval(() => this.cleanupIdlePages(), 30_000);
        // Start emergency cleanup for test environments
        if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
            this.__emergencyCleanupInterval = setInterval(() => this.emergencyCleanup(), 60_000);
            this.__resourceMonitorInterval = setInterval(() => this.monitorResources(), 30_000);
        }
    }
    briefPages() {
        this.logger.info(`Status: ${this.livePages.size} pages alive: ${Array.from(this.livePages).map((x) => this.snMap.get(x)).sort().join(', ')}; ${this.__loadedPage.length} idle pages: ${this.__loadedPage.map((x) => this.snMap.get(x)).sort().join(', ')}`);
        this.logger.info(`Pool status: ${this.pagePool.length} total pages, ${this.currentActivePages} active, ${this.requestQueue.length} queued`);
    }
    async createManagedPage() {
        const sn = this._sn++;
        let context;
        let page;
        if (!this.browser) {
            throw new Error('Browser not initialized');
        }
        try {
            context = this.browser.defaultBrowserContext();
            page = await context.newPage();
        }
        catch (error) {
            this.logger.error(`Failed to create page ${sn}:`, { error: (0, civkit_1.marshalErrorLike)(error) });
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
    async setupPage(page, sn) {
        const preparations = [];
        preparations.push(page.setBypassCSP(true));
        preparations.push(page.setViewport({ width: 1024, height: 1024 }));
        preparations.push(page.exposeFunction('reportSnapshot', (snapshot) => {
            if (snapshot.href === 'about:blank') {
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
        await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
        this.setupPageRequestHandling(page, sn);
        this.livePages.add(page);
        this.lastPageCreatedAt = Date.now();
    }
    setupPageRequestHandling(page, sn) {
        const domainSet = new Set();
        let reqCounter = 0;
        let t0;
        let halt = false;
        page.on('request', (req) => {
            reqCounter++;
            if (halt) {
                return req.abort('blockedbyclient', 1000);
            }
            t0 ??= Date.now();
            const requestUrl = req.url();
            if (!requestUrl.startsWith("http:") && !requestUrl.startsWith("https:") && requestUrl !== 'about:blank') {
                return req.abort('blockedbyclient', 1000);
            }
            try {
                const tldParsed = (0, tldts_1.parse)(requestUrl);
                if (tldParsed.domain)
                    domainSet.add(tldParsed.domain);
            }
            catch (error) {
                this.logger.warn(`Failed to parse TLD for URL: ${requestUrl}. Using fallback method.`);
                const simpleDomain = this.extractDomain(requestUrl);
                if (simpleDomain)
                    domainSet.add(simpleDomain);
            }
            const parsedUrl = new URL(requestUrl);
            if (this.circuitBreakerHosts.has(parsedUrl.hostname.toLowerCase())) {
                page.emit('abuse', { url: requestUrl, page, sn, reason: `Abusive request: ${requestUrl}` });
                return req.abort('blockedbyclient', 1000);
            }
            if (parsedUrl.hostname === 'localhost' ||
                parsedUrl.hostname.startsWith('127.')) {
                page.emit('abuse', { url: requestUrl, page, sn, reason: `Suspicious action: Request to localhost: ${requestUrl}` });
                return req.abort('blockedbyclient', 1000);
            }
            const dt = Math.ceil((Date.now() - t0) / 1000);
            const rps = reqCounter / dt;
            if (reqCounter > 1000) {
                if (rps > 60 || reqCounter > 2000) {
                    page.emit('abuse', { url: requestUrl, page, sn, reason: `DDoS attack suspected: Too many requests` });
                    halt = true;
                    return req.abort('blockedbyclient', 1000);
                }
            }
            if (domainSet.size > 200) {
                page.emit('abuse', { url: requestUrl, page, sn, reason: `DDoS attack suspected: Too many domains` });
                halt = true;
                return req.abort('blockedbyclient', 1000);
            }
            req.continue().catch(() => { });
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
                    }
                    catch (error) {
                        this.logger.warn(`Error closing page ${sn}:`, { error: (0, civkit_1.marshalErrorLike)(error) });
                    }
                })(),
                (0, civkit_1.delay)(5000)
            ]).finally(() => {
                resolve();
            });
        });
    }
    cleanupIdlePages() {
        const now = Date.now();
        const idlePages = this.pagePool.filter(mp => !mp.inUse && (now - mp.lastUsed) > this.PAGE_IDLE_TIMEOUT);
        idlePages.forEach(mp => {
            this.logger.info(`Cleaning up idle page ${mp.sn}`);
            this.destroyManagedPage(mp);
        });
    }
    processQueue() {
        if (this.processing || this.requestQueue.length === 0) {
            return;
        }
        this.processing = true;
        this.requestQueue.sort((a, b) => {
            if (a.priority !== b.priority)
                return b.priority - a.priority;
            return a.timestamp - b.timestamp;
        });
        while (this.requestQueue.length > 0 && this.currentActivePages < this.maxConcurrentPages) {
            const request = this.requestQueue.shift();
            let availablePage = this.pagePool.find(mp => !mp.inUse);
            if (availablePage) {
                availablePage.inUse = true;
                availablePage.lastUsed = Date.now();
                this.currentActivePages++;
                request.resolve(availablePage.page);
            }
            else if (this.pagePool.length < this.maxConcurrentPages) {
                this.createManagedPage().then(managedPage => {
                    this.pagePool.push(managedPage);
                    managedPage.inUse = true;
                    this.currentActivePages++;
                    request.resolve(managedPage.page);
                }).catch(error => {
                    request.reject(error);
                });
            }
            else {
                this.requestQueue.unshift(request);
                break;
            }
        }
        this.processing = false;
    }
    async init() {
        if (this.__healthCheckInterval) {
            clearInterval(this.__healthCheckInterval);
            this.__healthCheckInterval = undefined;
        }
        if (this.__cleanupInterval) {
            clearInterval(this.__cleanupInterval);
            this.__cleanupInterval = undefined;
        }
        await this.dependencyReady();
        if (this.browser) {
            if (this.browser.connected) {
                await this.browser.close();
            }
            else {
                this.browser.process()?.kill('SIGKILL');
            }
        }
        const args = [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding', '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection', '--disable-web-security',
            '--disable-features=VizDisplayCompositor', '--no-first-run', '--no-zygote',
            '--disable-gpu', '--headless=new', '--disable-extensions',
            '--disable-default-apps', '--disable-sync', '--no-default-browser-check',
            '--disable-background-networking', '--disable-component-update'
        ];
        this.browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium',
            args,
            timeout: 10_000,
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false
        }).catch((err) => {
            this.logger.error(`Browser launch failed.`, { err });
            process.nextTick(() => this.emit('error', err));
            return Promise.reject(err);
        });
        this.browser.once('disconnected', () => {
            this.logger.warn(`Browser disconnected`);
            this.emit('crippled');
            process.nextTick(() => this.serviceReady());
        });
        this.logger.info(`Browser launched: ${this.browser.process()?.pid}`);
        this.emit('ready');
        this.__healthCheckInterval = setInterval(() => this.healthCheck(), 30_000);
        this.newPage().then((r) => this.__loadedPage.push(r));
    }
    async healthCheck() {
        if (Date.now() - this.lastPageCreatedAt <= 10_000) {
            this.briefPages();
            return;
        }
        const healthyPage = await this.newPage().catch((err) => {
            this.logger.warn(`Health check failed`, { err: (0, civkit_1.marshalErrorLike)(err) });
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
        this.browser.process()?.kill('SIGKILL');
        Reflect.deleteProperty(this, 'browser');
        this.emit('crippled');
        this.logger.warn(`Browser killed`);
    }
    // FIX: Corrected the structure of this method. It was previously malformed.
    extractDomain(url) {
        try {
            const { hostname } = new URL(url);
            const parts = hostname.split('.');
            return parts.length > 1 ? parts.slice(-2).join('.') : hostname;
        }
        catch (error) {
            this.logger.warn(`Failed to extract domain from URL: ${url}. Error: ${error.message}`);
            return null; // Return null on failure
        }
    }
    // FIX: This method was previously inside `extractDomain` due to a copy-paste error.
    // It's now a proper class method, intended for creating pre-warmed/health-check pages.
    async newPage() {
        await this.serviceReady();
        if (!this.browser) {
            throw new Error('Browser not initialized');
        }
        const dedicatedContext = this.browser.defaultBrowserContext();
        const sn = this._sn++;
        const page = await dedicatedContext.newPage();
        const preparations = [];
        preparations.push(page.setBypassCSP(true));
        preparations.push(page.setViewport({ width: 1024, height: 1024 }));
        preparations.push(page.exposeFunction('reportSnapshot', (snapshot) => {
            if (snapshot.href === 'about:blank')
                return;
            const handler = this.snapshotHandlers.get(page);
            if (handler)
                handler(snapshot);
        }));
        preparations.push(page.evaluateOnNewDocument(SCRIPT_TO_INJECT_INTO_FRAME));
        preparations.push(page.setRequestInterception(true));
        await Promise.all(preparations);
        await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
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
                    reject(new Error('Page request timeout'));
                }
            }, 30000);
            request.resolve = (page) => { clearTimeout(timeout); resolve(page); };
            request.reject = (error) => { clearTimeout(timeout); reject(error); };
            this.processQueue();
        });
    }
    releasePage(page) {
        const managedPage = this.pagePool.find(mp => mp.page === page);
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
        if (page.isClosed())
            return;
        const sn = this.snMap.get(page);
        this.logger.info(`Ditching page ${sn}`);
        this.livePages.delete(page);
        try {
            await Promise.race([page.close(), (0, civkit_1.delay)(5000)]);
        }
        catch (err) {
            this.logger.error(`Failed to ditch page ${sn}`, { err: (0, civkit_1.marshalErrorLike)(err) });
        }
    }
    async *scrape(parsedUrl, options = {}) {
        const url = parsedUrl.toString();
        let page = null;
        try {
            page = await this.getNextPage(1); // Higher priority for scraping
            const sn = this.snMap.get(page) ?? -1;
            this.logger.info(`Page ${sn}: Scraping ${url}`);
            if (options.proxyUrl && page.useProxy) {
                await page.useProxy(options.proxyUrl);
            }
            if (options.cookies) {
                try {
                    options.cookies.forEach(validateCookie);
                    await page.setCookie(...options.cookies);
                }
                catch (error) {
                    this.logger.error(`Page ${sn}: Error setting cookies for ${url}`, { error, cookies: options.cookies });
                    throw error;
                }
            }
            if (options.overrideUserAgent) {
                await page.setUserAgent(options.overrideUserAgent);
            }
            const nextSnapshotDeferred = (0, civkit_1.Defer)();
            const crippleListener = () => nextSnapshotDeferred.reject(new errors_js_1.ServiceCrashedError({ message: `Browser crashed` }));
            this.once('crippled', crippleListener);
            nextSnapshotDeferred.promise.finally(() => this.off('crippled', crippleListener));
            let lastSnapshot;
            const hdl = (s) => {
                if (s?.maxElemDepth && s.maxElemDepth > 256)
                    return;
                if (s?.elemCount && s.elemCount > 10_000)
                    return;
                lastSnapshot = s;
                nextSnapshotDeferred.resolve(s);
            };
            this.snapshotHandlers.set(page, hdl);
            const timeout = options.timeoutMs || 30_000;
            const gotoPromise = page.goto(url, { waitUntil: 'load', timeout })
                .catch(err => {
                if (err.name === 'TimeoutError' || err.message?.includes('ERR_NAME_NOT_RESOLVED')) {
                    this.logger.warn(`Page ${sn}: Navigation to ${url} failed`, { err: (0, civkit_1.marshalErrorLike)(err) });
                    return; // Don't re-throw, just let it proceed to snapshotting if possible
                }
                throw err; // Re-throw other errors
            });
            const waitForPromise = options.waitForSelector
                ? page.waitForSelector(Array.isArray(options.waitForSelector) ? options.waitForSelector.join(', ') : options.waitForSelector, { timeout }).catch(err => {
                    this.logger.warn(`Page ${sn}: waitForSelector failed for ${url}`, { err: (0, civkit_1.marshalErrorLike)(err) });
                })
                : Promise.resolve();
            await Promise.all([gotoPromise, waitForPromise]);
            // Wait for a snapshot to be reported
            await Promise.race([nextSnapshotDeferred.promise, (0, civkit_1.delay)(options.minIntervalMs || 1000)]);
            const finalSnapshot = lastSnapshot || await page.evaluate('giveSnapshot()').catch(() => null);
            if (finalSnapshot) {
                this.logger.info(`Page ${sn}: Snapshot of ${url} done`, { title: finalSnapshot.title || 'Untitled' });
                yield finalSnapshot;
            }
            else {
                this.logger.warn(`Page ${sn}: No snapshot available for ${url}, trying screenshot.`);
                const screenshot = await page.screenshot().catch(() => undefined);
                const title = await page.title().catch(() => 'Scraping Failed');
                yield {
                    title,
                    href: url,
                    html: '',
                    text: '',
                    screenshot,
                    error: 'No snapshot available, screenshot taken as fallback.'
                };
            }
        }
        catch (error) {
            this.logger.error(`Scraping failed for ${url}:`, { error: (0, civkit_1.marshalErrorLike)(error) });
            yield {
                title: 'Error: Scraping failed',
                href: url,
                html: '',
                text: '',
                error: error.message || 'An unknown error occurred during scraping.'
            };
        }
        finally {
            if (page) {
                this.snapshotHandlers.delete(page);
                if (options.proxyUrl && page.useProxy) {
                    await page.useProxy(null); // Clear proxy
                }
                this.releasePage(page);
            }
        }
    }
    async salvage(url, page) {
        this.logger.info(`Salvaging ${url}`);
        const googleArchiveUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
        const resp = await fetch(googleArchiveUrl, {
            headers: { 'User-Agent': `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)` }
        });
        if (!resp.ok) {
            this.logger.warn(`No salvation found for url: ${url}`, { status: resp.status });
            return null;
        }
        await page.goto(googleArchiveUrl, { waitUntil: 'load', timeout: 15_000 }).catch((err) => {
            this.logger.warn(`Page salvation did not fully succeed.`, { err: (0, civkit_1.marshalErrorLike)(err) });
        });
        this.logger.info(`Salvation completed.`);
        return true;
    }
    async snapshotChildFrames(page) {
        const childFrames = page.mainFrame().childFrames();
        const results = await Promise.all(childFrames.map(async (frame) => {
            const frameUrl = frame.url();
            if (!frameUrl || frameUrl === 'about:blank')
                return undefined;
            try {
                await frame.evaluate(SCRIPT_TO_INJECT_INTO_FRAME);
                return await frame.evaluate(`giveSnapshot()`);
            }
            catch (err) {
                this.logger.warn(`Failed to snapshot child frame ${frameUrl}`, { err });
                return undefined;
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
        return undefined;
    }
    async close() {
        // Mark as closing to prevent new operations
        this.isClosing = true;
        // Clear intervals
        if (this.__healthCheckInterval) {
            clearInterval(this.__healthCheckInterval);
            this.__healthCheckInterval = undefined;
        }
        if (this.__cleanupInterval) {
            clearInterval(this.__cleanupInterval);
            this.__cleanupInterval = undefined;
        }
        if (this.__emergencyCleanupInterval) {
            clearInterval(this.__emergencyCleanupInterval);
            this.__emergencyCleanupInterval = undefined;
        }
        if (this.__resourceMonitorInterval) {
            clearInterval(this.__resourceMonitorInterval);
            this.__resourceMonitorInterval = undefined;
        }
        // Reject all pending requests to clear their timeouts
        this.requestQueue.forEach(req => {
            try {
                req.reject(new Error('PuppeteerControl is closing'));
            }
            catch (e) {
                // Ignore errors from already resolved requests
            }
        });
        this.requestQueue.length = 0;
        // Clean up all page finalizers by going through all pages we know about
        for (const page of this.livePages) {
            if (this.finalizerMap.has(page)) {
                const timeout = this.finalizerMap.get(page);
                if (timeout) {
                    clearTimeout(timeout);
                }
                this.finalizerMap.delete(page);
            }
        }
        // Close all pages in the pool
        for (const managedPage of this.pagePool) {
            try {
                if (!managedPage.page.isClosed()) {
                    await managedPage.page.close();
                }
            }
            catch (e) {
                // Ignore errors from already closed pages
            }
        }
        this.pagePool.length = 0;
        // Close loaded pages
        for (const page of this.__loadedPage) {
            try {
                if (!page.isClosed()) {
                    await page.close();
                }
            }
            catch (e) {
                // Ignore errors from already closed pages
            }
        }
        this.__loadedPage.length = 0;
        // Close browser
        if (this.browser && this.browser.connected) {
            await this.browser.close();
        }
        // Clear sets (WeakMaps will be garbage collected when pages are destroyed)
        this.livePages.clear();
        this.circuitBreakerHosts.clear();
        // Mark as closing to prevent new operations
        this.isClosing = true;
    }
    // Emergency cleanup for test environments
    emergencyCleanup() {
        if (this.isClosing)
            return;
        const currentTime = Date.now();
        const uptime = currentTime - this.startTime;
        // Force cleanup if running too long in test environment
        if (uptime > this.maxLifetime) {
            this.logger.warn('Emergency cleanup triggered due to excessive runtime');
            this.close().catch(err => {
                this.logger.error('Emergency cleanup failed', { err });
                // Force exit as last resort
                if (process.env.NODE_ENV === 'test') {
                    process.exit(1);
                }
            });
        }
    }
    // Monitor resource usage and detect leaks
    monitorResources() {
        if (this.isClosing)
            return;
        const pageCount = this.livePages.size + this.__loadedPage.length + this.pagePool.length;
        const requestCount = this.requestQueue.length;
        // Log resource status
        this.logger.info(`Resource monitor: ${pageCount} pages, ${requestCount} pending requests, ${this.currentActivePages} active`);
        // Detect potential leaks
        if (pageCount > 50) {
            this.logger.warn(`Potential page leak detected: ${pageCount} pages`);
        }
        if (requestCount > 100) {
            this.logger.warn(`Potential request queue leak detected: ${requestCount} requests`);
        }
        // Force cleanup of idle resources
        if (pageCount > 20) {
            this.cleanupIdlePages();
        }
    }
};
exports.PuppeteerControl = PuppeteerControl;
__decorate([
    (0, civkit_1.maxConcurrency)(1),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PuppeteerControl.prototype, "healthCheck", null);
exports.PuppeteerControl = PuppeteerControl = __decorate([
    (0, tsyringe_1.singleton)(),
    __metadata("design:paramtypes", [])
], PuppeteerControl);
const puppeteerControl = tsyringe_1.container.resolve(PuppeteerControl);
exports.default = puppeteerControl;
//# sourceMappingURL=puppeteer.js.map