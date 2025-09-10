import os from 'os';
import fs from 'fs';
import { container, singleton } from 'tsyringe';
import { AsyncService, Defer, marshalErrorLike, delay, maxConcurrency } from 'civkit';
import { Logger } from '../shared/index.js';
import { createRequire } from 'module';

const nodeRequire = createRequire(import.meta.url);

import type { Browser, Page, BrowserContext } from 'puppeteer';

// Import fetch conditionally - use native fetch in Node 18+
const fetch = globalThis.fetch;

let puppeteerCore: any;
let addExtra: any;

if (process.env.USE_PUPPETEER_MOCK === 'true') {
    console.log('🔧 Using Puppeteer mock implementation');
    // Dynamic runtime import so TypeScript does not treat test files as part of production build
    const mockPath = new URL('../../test/mock-puppeteer.js', import.meta.url).href;
    const { mockPuppeteer, mockAddExtra } = await import(mockPath);
    puppeteerCore = mockPuppeteer;
    addExtra = mockAddExtra;
} else {
  puppeteerCore = await import('puppeteer');
  const puppeteerExtra = await import('puppeteer-extra');
  addExtra = puppeteerExtra.addExtra;
}

// Define CookieParam type since it's not exported from puppeteer
export interface CookieParam {
    name: string;
    value: string;
    url?: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    expires?: number;
}

import puppeteerPageProxy from 'puppeteer-extra-plugin-page-proxy';
import { ServiceCrashedError } from '../shared/errors.js';
import { parse as tldParse } from 'tldts';
import puppeteerStealth from 'puppeteer-extra-plugin-stealth';

// Queue for managing concurrent requests
interface QueuedRequest {
    resolve: (value: Page) => void;
    reject: (error: any) => void;
    priority: number;
    timestamp: number;
}

// Page wrapper with context tracking
interface ManagedPage {
    page: Page;
    context: BrowserContext;
    sn: number;
    createdAt: number;
    inUse: boolean;
    lastUsed: number;
}

// Add this new function for cookie validation
const validateCookie = (cookie: CookieParam) => {
    const requiredFields = ['name', 'value'];
    for (const field of requiredFields) {
        if (!(field in cookie)) {
            throw new Error(`Cookie is missing required field: ${field}`);
        }
    }
};

const READABILITY_JS = fs.readFileSync(nodeRequire.resolve('@mozilla/readability/Readability.js'), 'utf-8');


export interface ImgBrief {
    src: string;
    loaded?: boolean;
    width?: number;
    height?: number;
    naturalWidth?: number;
    naturalHeight?: number;
    alt?: string;
}

export interface ReadabilityParsed {
    title: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    byline: string;
    dir: string;
    siteName: string;
    lang: string;
    publishedTime: string;
}

export interface PageSnapshot {
    title: string;
    href: string;
    rebase?: string;
    html: string;
    text: string;
    parsed?: Partial<ReadabilityParsed> | null;
    screenshot?: Buffer;
    pageshot?: Buffer;
    imgs?: ImgBrief[];
    pdfs?: string[];
    maxElemDepth?: number;
    elemCount?: number;
    childFrames?: PageSnapshot[];
    error?: string;
}

export interface ExtendedSnapshot extends PageSnapshot {
    links: { [url: string]: string; };
    imgs: ImgBrief[];
}

export interface ScrappingOptions {
    proxyUrl?: string;
    cookies?: CookieParam[];
    favorScreenshot?: boolean;
    waitForSelector?: string | string[];
    minIntervalMs?: number;
    overrideUserAgent?: string;
    timeoutMs?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    fullPage?: boolean;
}

const puppeteer = addExtra(puppeteerCore);

puppeteer.use(puppeteerStealth());
puppeteer.use(puppeteerPageProxy({
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

@singleton()
export class PuppeteerControl extends AsyncService {

    _sn = 0;
    browser!: Browser;
    logger = new Logger('PuppeteerControl'); // Renamed for clarity

    private __healthCheckInterval?: NodeJS.Timeout;
    private __cleanupInterval?: NodeJS.Timeout;
    private __emergencyCleanupInterval?: NodeJS.Timeout;
    private __resourceMonitorInterval?: NodeJS.Timeout;

    // Resource tracking for leak prevention
    private startTime = Date.now();
    private maxLifetime = 10 * 60 * 1000; // 10 minutes max lifetime in tests
    private isClosing = false;

    // New queue-based system
    private requestQueue: QueuedRequest[] = [];
    private pagePool: ManagedPage[] = [];
    private maxConcurrentPages = 10; // Configurable max concurrent pages
    private currentActivePages = 0;
    private processing = false;
    private readonly PAGE_IDLE_TIMEOUT = 60 * 1000; // 1 minute for idle pages
    private readonly MAX_PAGE_LIFETIME = 5 * 60 * 1000; // 5 minutes max lifetime
    private readonly CLEANUP_INTERVAL = 30 * 1000; // 30 seconds cleanup interval

    __loadedPage: Page[] = [];

    finalizerMap = new WeakMap<Page, ReturnType<typeof global.setTimeout>>();
    snMap = new WeakMap<Page, number>();
    livePages = new Set<Page>();
    lastPageCreatedAt: number = 0;

    circuitBreakerHosts: Set<string> = new Set();

    // Map to store snapshot handlers for each page
    snapshotHandlers = new WeakMap<Page, (snapshot: PageSnapshot) => void>();

    constructor(
    ) {
        super();
        this.setMaxListeners(2 * Math.floor(os.totalmem() / (256 * 1024 * 1024)) + 1);

        this.on('crippled', () => {
            this.__loadedPage.length = 0;
            this.livePages.clear();
            this.pagePool.forEach(mp => this.destroyManagedPage(mp));
            this.pagePool.length = 0;
            this.currentActivePages = 0;
            // Reject all queued requests
            this.requestQueue.forEach(req => req.reject(new ServiceCrashedError({ message: 'Browser crashed' })));
            this.requestQueue.length = 0;
        });
``
        // Start cleanup interval
        this.__cleanupInterval = setInterval(() => this.cleanupIdlePages(), 30_000);

        // Start emergency cleanup for test environments
        if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
            this.__emergencyCleanupInterval = setInterval(() => this.emergencyCleanup(), 60_000);
            this.__resourceMonitorInterval = setInterval(() => this.monitorResources(), 30_000);
        }
    }

    /**
     * Emergency cleanup for memory leak prevention
     */
    private emergencyCleanup(): void {
        const now = Date.now();
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const rssMB = Math.round(memUsage.rss / 1024 / 1024);

        this.logger.info('Emergency cleanup check', {
            heapUsedMB,
            rssMB,
            livePages: this.livePages.size,
            poolPages: this.pagePool.length,
            queueLength: this.requestQueue.length
        });

        // Force cleanup if memory usage is high
        if (heapUsedMB > 512 || rssMB > 1024) {
            this.logger.warn('High memory usage detected, forcing cleanup', {
                heapUsedMB,
                rssMB
            });
            
            // Force cleanup all idle pages immediately
            const idlePages = this.pagePool.filter(mp => !mp.inUse);
            idlePages.forEach(mp => this.destroyManagedPage(mp));
            
            // If still high memory, force close oldest pages
            if (this.pagePool.length > 5) {
                const oldestPages = this.pagePool
                    .sort((a, b) => a.createdAt - b.createdAt)
                    .slice(0, Math.floor(this.pagePool.length / 2));
                
                oldestPages.forEach(mp => {
                    this.logger.warn(`Force closing page ${mp.sn} due to high memory usage`);
                    this.destroyManagedPage(mp);
                });
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                this.logger.info('Forced garbage collection');
            }
        }
        
        // Check for process lifetime
        if (process.env.NODE_ENV === 'test' && (now - this.startTime) > this.maxLifetime) {
            this.logger.warn('Test environment max lifetime exceeded, triggering restart');
            this.emit('restart-needed');
        }
    }

    /**
     * Monitor resources and log warnings
     */
    private monitorResources(): void {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const rssMB = Math.round(memUsage.rss / 1024 / 1024);
        const externalMB = Math.round(memUsage.external / 1024 / 1024);
        
        const stats = {
            heap: {
                used: heapUsedMB,
                total: heapTotalMB,
                percent: Math.round((heapUsedMB / heapTotalMB) * 100)
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
        
        // Log detailed stats every 5 minutes or if there are issues
        if (stats.heap.percent > 80 || stats.rss > 1024 || stats.pages.live > 20) {
            this.logger.warn('Resource usage warning', stats);
        } else {
            this.logger.debug('Resource monitoring', stats);
        }
    }

    briefPages() {
    // eslint-disable-next-line max-len
    this.logger.info(`Status: ${this.livePages.size} pages alive: ${Array.from(this.livePages).map((x) => this.snMap.get(x)).sort().join(', ')}; ${this.__loadedPage.length} idle pages: ${this.__loadedPage.map((x) => this.snMap.get(x)).sort().join(', ')}`);
        this.logger.info(`Pool status: ${this.pagePool.length} total pages, ${this.currentActivePages} active, ${this.requestQueue.length} queued`);
    }

    private async createManagedPage(): Promise<ManagedPage> {
        const sn = this._sn++;
        let context: BrowserContext;
        let page: Page;

        if (!this.browser) {
            throw new Error('Browser not initialized');
        }

        try {
            context = this.browser.defaultBrowserContext();
            page = await context.newPage();
        } catch (error) {
            this.logger.error(`Failed to create page ${sn}:`, { error: marshalErrorLike(error as Error) });
            throw error;
        }

        const managedPage: ManagedPage = {
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

    private async setupPage(page: Page, sn: number, options?: ScrappingOptions): Promise<void> {
        const preparations: any[] = [];

        preparations.push(page.setBypassCSP(true));

        // Set viewport based on options or default
        const viewport = {
            width: options?.viewportWidth || 1024,
            height: options?.viewportHeight || 1024
        };
        preparations.push(page.setViewport(viewport));

        preparations.push(page.exposeFunction('reportSnapshot', (snapshot: PageSnapshot) => {
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

    private setupPageRequestHandling(page: Page, sn: number): void {
        const domainSet = new Set<string>();
        let reqCounter = 0;
        let t0: number | undefined;
        let halt = false;

        page.on('request', (req: any) => {
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
                const tldParsed = tldParse(requestUrl);
                if (tldParsed.domain) domainSet.add(tldParsed.domain);
            } catch (error) {
                this.logger.warn(`Failed to parse TLD for URL: ${requestUrl}. Using fallback method.`);
                const simpleDomain = this.extractDomain(requestUrl);
                if (simpleDomain) domainSet.add(simpleDomain);
            }

            const parsedUrl = new URL(requestUrl);

            if (this.circuitBreakerHosts.has(parsedUrl.hostname.toLowerCase())) {
                page.emit('abuse', { url: requestUrl, page, sn, reason: `Abusive request: ${requestUrl}` });
                return req.abort('blockedbyclient', 1000);
            }

            if (
                parsedUrl.hostname === 'localhost' ||
                parsedUrl.hostname.startsWith('127.')
            ) {
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

            req.continue().catch(() => {/* Ignore errors on continue */});
        });
    }

    private destroyManagedPage(managedPage: ManagedPage): Promise<void> {
        return new Promise<void>((resolve) => {
            const { page, sn } = managedPage;

            if (this.finalizerMap.has(page)) {
                clearTimeout(this.finalizerMap.get(page)!);
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
                        this.logger.warn(`Error closing page ${sn}:`, { error: marshalErrorLike(error as Error) });
                    }
                })(),
                delay(5000)
            ]).finally(() => {
                resolve();
            });
        });
    }

    private cleanupIdlePages(): void {
        const now = Date.now();
        
        // Clean up idle pages
        const idlePages = this.pagePool.filter(mp =>
            !mp.inUse && (now - mp.lastUsed) > this.PAGE_IDLE_TIMEOUT
        );

        // Clean up pages that have exceeded max lifetime
        const expiredPages = this.pagePool.filter(mp =>
            (now - mp.createdAt) > this.MAX_PAGE_LIFETIME
        );

        const pagesToCleanup = [...new Set([...idlePages, ...expiredPages])];
        
        if (pagesToCleanup.length > 0) {
            this.logger.info(`Cleaning up ${pagesToCleanup.length} pages`, {
                idle: idlePages.length,
                expired: expiredPages.length
            });
            
            pagesToCleanup.forEach(mp => {
                this.logger.debug(`Cleaning up page ${mp.sn}`, {
                    idle: !mp.inUse && (now - mp.lastUsed) > this.PAGE_IDLE_TIMEOUT,
                    expired: (now - mp.createdAt) > this.MAX_PAGE_LIFETIME,
                    inUse: mp.inUse
                });
                this.destroyManagedPage(mp);
            });
        }
    }

    private processQueue(): void {
        if (this.processing || this.requestQueue.length === 0) {
            return;
        }
        this.processing = true;

        this.requestQueue.sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            return a.timestamp - b.timestamp;
        });

        while (this.requestQueue.length > 0 && this.currentActivePages < this.maxConcurrentPages) {
            const request = this.requestQueue.shift()!;
            let availablePage = this.pagePool.find(mp => !mp.inUse);

            if (availablePage) {
                availablePage.inUse = true;
                availablePage.lastUsed = Date.now();
                this.currentActivePages++;
                request.resolve(availablePage.page);
            } else if (this.pagePool.length < this.maxConcurrentPages) {
                this.createManagedPage().then(managedPage => {
                    this.pagePool.push(managedPage);
                    managedPage.inUse = true;
                    this.currentActivePages++;
                    request.resolve(managedPage.page);
                }).catch(error => {
                    request.reject(error);
                });
            } else {
                this.requestQueue.unshift(request);
                break;
            }
        }
        this.processing = false;
    }

    override async init() {
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
            } else {
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

        const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_EXECUTABLE || undefined;
        const launchOpts: any = {
            args,
            timeout: 10_000,
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false,
        };
        if (execPath) launchOpts.executablePath = execPath;

        this.browser = await puppeteer.launch(launchOpts).catch((err: any) => {
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

    @maxConcurrency(1)
    async healthCheck() {
        if (Date.now() - this.lastPageCreatedAt <= 10_000) {
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
                this.ditchPage(this.__loadedPage.shift()!);
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
    private extractDomain(url: string): string | null {
        try {
            const { hostname } = new URL(url);
            const parts = hostname.split('.');
            return parts.length > 1 ? parts.slice(-2).join('.') : hostname;
        } catch (error: any) {
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
        const preparations: any[] = [];

        preparations.push(page.setBypassCSP(true));
        preparations.push(page.setViewport({ width: 1024, height: 1024 }));
        preparations.push(page.exposeFunction('reportSnapshot', (snapshot: PageSnapshot) => {
            if (snapshot.href === 'about:blank') return;
            const handler = this.snapshotHandlers.get(page);
            if (handler) handler(snapshot);
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

    async getNextPage(priority: number = 0): Promise<Page> {
        return new Promise<Page>((resolve, reject) => {
            const request: QueuedRequest = { resolve, reject, priority, timestamp: Date.now() };
            this.requestQueue.push(request);

            const timeout = setTimeout(() => {
                const index = this.requestQueue.indexOf(request);
                if (index !== -1) {
                    this.requestQueue.splice(index, 1);
                    reject(new Error('Page request timeout'));
                }
            }, 30000);

            request.resolve = (page: Page) => { clearTimeout(timeout); resolve(page); };
            request.reject = (error: any) => { clearTimeout(timeout); reject(error); };

            this.processQueue();
        });
    }

    releasePage(page: Page): void {
        const managedPage = this.pagePool.find(mp => mp.page === page);
        if (managedPage && managedPage.inUse) {
            managedPage.inUse = false;
            managedPage.lastUsed = Date.now();
            this.currentActivePages--;
            this.processQueue();
        }
    }

    async ditchPage(page: Page) {
        if (this.finalizerMap.has(page)) {
            clearTimeout(this.finalizerMap.get(page)!);
            this.finalizerMap.delete(page);
        }
        if (page.isClosed()) return;

        const sn = this.snMap.get(page);
        this.logger.info(`Ditching page ${sn}`);
        this.livePages.delete(page);
        try {
            await Promise.race([page.close(), delay(5000)]);
        } catch (err) {
            this.logger.error(`Failed to ditch page ${sn}`, { err: marshalErrorLike(err as Error) });
        }
    }

    async *scrape(parsedUrl: URL, options: ScrappingOptions = {}): AsyncGenerator<PageSnapshot> {
        const url = parsedUrl.toString();
        let page: Page | null = null;

        try {
            page = await this.getNextPage(1); // Higher priority for scraping
            const sn = this.snMap.get(page) ?? -1;
            this.logger.info(`Page ${sn}: Scraping ${url}`);

            // Configure viewport based on options
            if (options.viewportWidth || options.viewportHeight) {
                const viewport = {
                    width: options.viewportWidth || 1024,
                    height: options.viewportHeight || 1024
                };
                await page.setViewport(viewport);
                this.logger.info(`Page ${sn}: Set viewport to ${viewport.width}x${viewport.height}`);
            }

            if (options.proxyUrl && (page as any).useProxy) {
                await (page as any).useProxy(options.proxyUrl);
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

            const nextSnapshotDeferred = Defer<PageSnapshot>();
            const crippleListener = () => nextSnapshotDeferred.reject(new ServiceCrashedError({ message: `Browser crashed` }));
            this.once('crippled', crippleListener);
            nextSnapshotDeferred.promise.finally(() => this.off('crippled', crippleListener));

            let lastSnapshot: PageSnapshot | undefined;
            const hdl = (s: PageSnapshot) => {
                if (s?.maxElemDepth && s.maxElemDepth > 256) return;
                if (s?.elemCount && s.elemCount > 10_000) return;
                lastSnapshot = s;
                nextSnapshotDeferred.resolve(s);
            };
            this.snapshotHandlers.set(page, hdl);

            const timeout = options.timeoutMs || 30_000;

            const gotoPromise = page.goto(url, { waitUntil: 'load', timeout })
                .catch(err => {
                    if (err.name === 'TimeoutError' || err.message?.includes('ERR_NAME_NOT_RESOLVED')) {
                        this.logger.warn(`Page ${sn}: Navigation to ${url} failed`, { err: marshalErrorLike(err) });
                        return; // Don't re-throw, just let it proceed to snapshotting if possible
                    }
                    throw err; // Re-throw other errors
                });

            const waitForPromise = options.waitForSelector
                ? page.waitForSelector(
                    Array.isArray(options.waitForSelector) ? options.waitForSelector.join(', ') : options.waitForSelector,
                    { timeout }
                  ).catch(err => {
                      this.logger.warn(`Page ${sn}: waitForSelector failed for ${url}`, { err: marshalErrorLike(err) });
                  })
                : Promise.resolve();

            await Promise.all([gotoPromise, waitForPromise]);

            // Wait for a snapshot to be reported
            await Promise.race([nextSnapshotDeferred.promise, delay(options.minIntervalMs || 1000)]);

            const finalSnapshot = lastSnapshot || await page.evaluate('giveSnapshot()').catch(() => null) as PageSnapshot | null;

            if (finalSnapshot) {
                this.logger.info(`Page ${sn}: Snapshot of ${url} done`, { title: finalSnapshot.title || 'Untitled' });
                yield finalSnapshot;
            } else {
                this.logger.warn(`Page ${sn}: No snapshot available for ${url}, trying screenshot.`);
                const screenshot = await page.screenshot().catch(() => undefined) as Buffer | undefined;
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

        } catch (error: any) {
            this.logger.error(`Scraping failed for ${url}:`, { error: marshalErrorLike(error) });
            yield {
                title: 'Error: Scraping failed',
                href: url,
                html: '',
                text: '',
                error: error.message || 'An unknown error occurred during scraping.'
            };
        } finally {
            if (page) {
                this.snapshotHandlers.delete(page);
                if (options.proxyUrl && (page as any).useProxy) {
                    await (page as any).useProxy(null); // Clear proxy
                }
                this.releasePage(page);
            }
        }
    }

    async salvage(url: string, page: Page) {
        this.logger.info(`Salvaging ${url}`);
        const googleArchiveUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
        const resp = await fetch(googleArchiveUrl, {
            headers: { 'User-Agent': `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)` }
        });
        if (!resp.ok) {
            this.logger.warn(`No salvation found for url: ${url}`, { status: resp.status });
            return null;
        }

        await page.goto(googleArchiveUrl, { waitUntil: 'load', timeout: 15_000 }).catch((err: any) => {
            this.logger.warn(`Page salvation did not fully succeed.`, { err: marshalErrorLike(err) });
        });

        this.logger.info(`Salvation completed.`);
        return true;
    }

    async snapshotChildFrames(page: Page): Promise<PageSnapshot[]> {
        const childFrames = page.mainFrame().childFrames();
        const results = await Promise.all(childFrames.map(async (frame) => {
            const frameUrl = frame.url();
            if (!frameUrl || frameUrl === 'about:blank') return undefined;
            try {
                await frame.evaluate(SCRIPT_TO_INJECT_INTO_FRAME);
                return await frame.evaluate(`giveSnapshot()`) as PageSnapshot;
            } catch (err) {
                this.logger.warn(`Failed to snapshot child frame ${frameUrl}`, { err });
                return undefined;
            }
        }));
        return results.filter((r): r is PageSnapshot => Boolean(r));
    }

    async crawl(url: URL, options?: ScrappingOptions): Promise<PageSnapshot | undefined> {
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
            } catch (e) {
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
            } catch (e) {
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
            } catch (e) {
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

}

const puppeteerControl = container.resolve(PuppeteerControl);

export default puppeteerControl;
