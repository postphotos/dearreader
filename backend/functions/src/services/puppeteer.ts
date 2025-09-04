import os from 'os';
import fs from 'fs';
import { container, singleton } from 'tsyringe';
import { AsyncService, Defer, marshalErrorLike, AssertionFailureError, delay, maxConcurrency } from 'civkit';
import { Logger } from '../shared/index';

import type { Browser, Protocol, Page, BrowserContext } from 'puppeteer';
import puppeteer from 'puppeteer-extra';

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

import puppeteerBlockResources from 'puppeteer-extra-plugin-block-resources';
import puppeteerPageProxy from 'puppeteer-extra-plugin-page-proxy';
import { SecurityCompromiseError, ServiceCrashedError } from '../shared/errors';
// import { TimeoutError } from 'puppeteer';
import tldExtract from 'tld-extract';
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
        if (!cookie[field]) {
            throw new Error(`Cookie is missing required field: ${field}`);
        }
    }
};

const READABILITY_JS = fs.readFileSync(require.resolve('@mozilla/readability/Readability.js'), 'utf-8');


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
}

puppeteer.use(puppeteerStealth());
// const puppeteerUAOverride = require('puppeteer-extra-plugin-stealth/evasions/user-agent-override');
// puppeteer.use(puppeteerUAOverride({
//     userAgent: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)`,
//     platform: `Linux`,
// }))

puppeteer.use(puppeteerBlockResources({
    blockedTypes: new Set(['media']),
    interceptResolutionPriority: 1,
}));
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
    logger = new Logger('CHANGE_LOGGER_NAME');

    private __healthCheckInterval?: NodeJS.Timeout;

    // New queue-based system
    private requestQueue: QueuedRequest[] = [];
    private pagePool: ManagedPage[] = [];
    private maxConcurrentPages = 10; // Configurable max concurrent pages
    private currentActivePages = 0;
    private processing = false;
    private readonly PAGE_TIMEOUT = 300 * 1000; // 5 minutes
    private readonly PAGE_IDLE_TIMEOUT = 60 * 1000; // 1 minute for idle pages

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

        // Start cleanup interval
        setInterval(() => this.cleanupIdlePages(), 30_000);
    }

    briefPages() {
        this.logger.info(`Status: ${this.livePages.size} pages alive: ${Array.from(this.livePages).map((x) => this.snMap.get(x)).sort().join(', ')}; ${this.__loadedPage.length} idle pages: ${this.__loadedPage.map((x) => this.snMap.get(x)).sort().join(', ')}`);
        this.logger.info(`Pool status: ${this.pagePool.length} total pages, ${this.currentActivePages} active, ${this.requestQueue.length} queued`);
    }

    // New queue-based page management
    private async createManagedPage(): Promise<ManagedPage> {
        const sn = this._sn++;
        let context: BrowserContext;
        let page: Page;

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

        // Setup page with the same configuration as before
        await this.setupPage(page, sn);

        return managedPage;
    }

    private async setupPage(page: Page, sn: number): Promise<void> {
        const preparations: any[] = [];

        preparations.push(page.setBypassCSP(true));
        preparations.push(page.setViewport({ width: 1024, height: 1024 }));
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

        // Set up request handling (same as before)
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
                const tldParsed = tldExtract(requestUrl);
                domainSet.add(tldParsed.domain);
            } catch (error) {
                this.logger.warn(`Failed to parse TLD for URL: ${requestUrl}. Using fallback method.`);
                const simpleDomain = this.extractDomain(requestUrl);
                domainSet.add(simpleDomain);
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

            const continueArgs = req.continueRequestOverrides
                ? [req.continueRequestOverrides(), 0] as const
                : [];

            return req.continue(continueArgs[0], continueArgs[1]);
        });

        // Add the page load handling script
        page.evaluateOnNewDocument(`
let lastTextLength = 0;
const handlePageLoad = () => {
    if (window.haltSnapshot) {
        return;
    }
    const thisTextLength = (document.body.innerText || '').length;
    const deltaLength = Math.abs(thisTextLength - lastTextLength);
    if (10 * deltaLength < lastTextLength) {
        return;
    }
    lastTextLength = thisTextLength;
    const snapshot = reportSnapshot ? reportSnapshot(giveSnapshot()) : null;
};

let handlePageLoadCallCounter = 0;

window.addEventListener("load", () => {
    const handlePageLoadCallSeq = ++handlePageLoadCallCounter;
    setTimeout(() => {
        if (handlePageLoadCallSeq !== handlePageLoadCallCounter) {
            return;
        }
        handlePageLoad();
    }, 100);
});

new MutationObserver(() => {
    const handlePageLoadCallSeq = ++handlePageLoadCallCounter;
    setTimeout(() => {
        if (handlePageLoadCallSeq !== handlePageLoadCallCounter) {
            return;
        }
        handlePageLoad();
    }, 500);
}).observe(document.body || document.documentElement, { attributes: true, childList: true, subtree: true });
`);
    }

    private destroyManagedPage(managedPage: ManagedPage): Promise<void> {
        return new Promise<void>((resolve) => {
            const { page, context, sn } = managedPage;

            if (this.finalizerMap.has(page)) {
                clearTimeout(this.finalizerMap.get(page)!);
                this.finalizerMap.delete(page);
            }

            this.logger.info(`Destroying managed page ${sn}`);
            this.livePages.delete(page);
            this.snMap.delete(page);

            // Remove from pool
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
                        await page.close();
                        await context.close();
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
        const idlePages = this.pagePool.filter(mp =>
            !mp.inUse && (now - mp.lastUsed) > this.PAGE_IDLE_TIMEOUT
        );

        idlePages.forEach(mp => {
            this.logger.info(`Cleaning up idle page ${mp.sn}`);
            this.destroyManagedPage(mp);
        });
    }

    private processQueue(): void {
        if (this.processing || this.requestQueue.length === 0) {
            return;
        }

        this.processing = true;

        // Sort queue by priority and timestamp
        this.requestQueue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // Higher priority first
            }
            return a.timestamp - b.timestamp; // Earlier timestamp first
        });

        while (this.requestQueue.length > 0 && this.currentActivePages < this.maxConcurrentPages) {
            const request = this.requestQueue.shift()!;

            // Find available page or create new one
            let availablePage = this.pagePool.find(mp => !mp.inUse);

            if (availablePage) {
                availablePage.inUse = true;
                availablePage.lastUsed = Date.now();
                this.currentActivePages++;
                request.resolve(availablePage.page);
            } else if (this.pagePool.length < this.maxConcurrentPages) {
                // Create new page asynchronously
                this.createManagedPage()
                    .then(managedPage => {
                        this.pagePool.push(managedPage);
                        managedPage.inUse = true;
                        this.currentActivePages++;
                        request.resolve(managedPage.page);
                    })
                    .catch(error => {
                        request.reject(error as Error);
                    });
            } else {
                // Put request back in queue (shouldn't happen if logic is correct)
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
        await this.dependencyReady();

        if (this.browser) {
            if (this.browser.isConnected()) {
                await this.browser.close();
            } else {
                this.browser.process()?.kill('SIGKILL');
            }
        }
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--headless=new',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--no-default-browser-check',
            '--disable-background-networking',
            '--disable-component-update'
        ];

        this.browser = await puppeteer.launch({
            args: args,
            timeout: 10_000,
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false
        }).catch((err: any) => {
            this.logger.error(`Unknown firebase issue, just die fast.`, { err });
            process.nextTick(() => {
                this.emit('error', err);
                // process.exit(1);
            });
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

    private extractDomain(url: string): string {
        try {
            const { hostname } = new URL(url);
            const parts = hostname.split('.');
            return parts.length > 1 ? parts.slice(-2).join('.') : hostname;
        } catch (error: any) {
            this.logger.warn(`Failed to extract domain from URL: ${url}. Error: ${error.message}`);
            return url;
        }
    }

    async newPage() {
        await this.serviceReady();
        const dedicatedContext = this.browser.defaultBrowserContext();
        const sn = this._sn++;
        const page = await dedicatedContext.newPage();
        const preparations: any[] = [];

        // preparations.push(page.setUserAgent(`Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)`));
        // preparations.push(page.setUserAgent(`Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)`));
        preparations.push(page.setBypassCSP(true));
        preparations.push(page.setViewport({ width: 1024, height: 1024 }));
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
                const tldParsed = tldExtract(requestUrl);
                domainSet.add(tldParsed.domain);
            } catch (error) {
                this.logger.warn(`Failed to parse TLD for URL: ${requestUrl}. Using fallback method.`);
                const simpleDomain = this.extractDomain(requestUrl);
                domainSet.add(simpleDomain);
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
            // console.log(`rps: ${rps}`);

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

            const continueArgs = req.continueRequestOverrides
                ? [req.continueRequestOverrides(), 0] as const
                : [];

            return req.continue(continueArgs[0], continueArgs[1]);
        });

        await page.evaluateOnNewDocument(`
let lastTextLength = 0;
const handlePageLoad = () => {
    if (window.haltSnapshot) {
        return;
    }
    const thisTextLength = (document.body.innerText || '').length;
    const deltaLength = Math.abs(thisTextLength - lastTextLength);
    if (10 * deltaLength < lastTextLength) {
        // Change is not significant
        return;
    }
    const r = giveSnapshot();
    window.reportSnapshot(r);
    lastTextLength = thisTextLength;
};
setInterval(handlePageLoad, 800);
document.addEventListener('readystatechange', handlePageLoad);
document.addEventListener('load', handlePageLoad);
`);

        this.snMap.set(page, sn);
        this.logger.info(`Page ${sn} created.`);
        this.lastPageCreatedAt = Date.now();
        this.livePages.add(page);

        return page;
    }

    async getNextPage(priority: number = 0): Promise<Page> {
        return new Promise<Page>((resolve, reject) => {
            const request: QueuedRequest = {
                resolve,
                reject,
                priority,
                timestamp: Date.now()
            };

            this.requestQueue.push(request);

            // Set timeout for request
            const timeout = setTimeout(() => {
                const index = this.requestQueue.indexOf(request);
                if (index !== -1) {
                    this.requestQueue.splice(index, 1);
                    reject(new Error('Page request timeout'));
                }
            }, 30000); // 30 second timeout

            request.resolve = ((originalResolve) => {
                return (page: Page) => {
                    clearTimeout(timeout);
                    originalResolve(page);
                };
            })(resolve);

            request.reject = ((originalReject) => {
                return (error: any) => {
                    clearTimeout(timeout);
                    originalReject(error);
                };
            })(reject);

            // Process queue
            this.processQueue();
        });
    }

    releasePage(page: Page): void {
        const managedPage = this.pagePool.find(mp => mp.page === page);
        if (managedPage && managedPage.inUse) {
            managedPage.inUse = false;
            managedPage.lastUsed = Date.now();
            this.currentActivePages--;

            // Try to process more requests
            this.processQueue();
        }
    }

    async ditchPage(page: Page) {
        if (this.finalizerMap.has(page)) {
            clearTimeout(this.finalizerMap.get(page)!);
            this.finalizerMap.delete(page);
        }
        if (page.isClosed()) {
            return;
        }
        const sn = this.snMap.get(page);
        this.logger.info(`Closing page ${sn}`);
        this.livePages.delete(page);
        await Promise.race([
            (async () => {
                const ctx = page.browserContext();
                await page.close();
                await ctx.close();
            })(), delay(5000)
        ]).catch((err) => {
            this.logger.error(`Failed to destroy page ${sn}`, { err: marshalErrorLike(err) });
        });
    }

    async *scrap(parsedUrl: URL, options?: ScrappingOptions): AsyncGenerator<PageSnapshot | undefined> {
        // parsedUrl.search = '';
        console.log('Scraping options:', options);
        const url = parsedUrl.toString();

        let snapshot: PageSnapshot | undefined;
        let screenshot: Buffer | undefined;
        let pageshot: Buffer | undefined;
        let page: Page | null = null;

        try {
            page = await this.getNextPage(1); // Higher priority for scraping requests
            const sn = this.snMap.get(page);
            this.logger.info(`Page ${sn}: Scraping ${url}`, { url });

            if (options?.proxyUrl) {
                this.logger.info(`Page ${sn}: Proxy not supported in current setup:`, options.proxyUrl);
                // await page.useProxy(options.proxyUrl);
            }

            if (options?.cookies) {
                this.logger.info(`Page ${sn}: Attempting to set cookies:`, JSON.stringify(options.cookies, null, 2));
                try {
                    options.cookies.forEach(validateCookie);
                    await page.setCookie(...options.cookies);
                } catch (error) {
                    this.logger.error(`Page ${sn}: Error setting cookies:`, error);
                    this.logger.info(`Page ${sn}: Problematic cookies:`, JSON.stringify(options.cookies, null, 2));
                    throw error;
                }
            }

            if (options?.overrideUserAgent) {
                await page.setUserAgent(options.overrideUserAgent);
            }

            let nextSnapshotDeferred = Defer();
            const crippleListener = () => nextSnapshotDeferred.reject(new ServiceCrashedError({ message: `Browser crashed, try again` }));
            this.once('crippled', crippleListener);
            nextSnapshotDeferred.promise.finally(() => {
                this.off('crippled', crippleListener);
            });

            const hdl = (s: any) => {
                if (snapshot === s) {
                    return;
                }
                snapshot = s;
                if (s?.maxElemDepth && s.maxElemDepth > 256) {
                    return;
                }
                if (s?.elemCount && s.elemCount > 10_000) {
                    return;
                }
                nextSnapshotDeferred.resolve(s);
                nextSnapshotDeferred = Defer();
                this.once('crippled', crippleListener);
                nextSnapshotDeferred.promise.finally(() => {
                    this.off('crippled', crippleListener);
                });
            };
            this.snapshotHandlers.set(page, hdl);
            // page.once('abuse', (event: any) => {
            //     this.emit('abuse', { ...event, url: parsedUrl });
            //     nextSnapshotDeferred.reject(
            //         new SecurityCompromiseError(`Abuse detected: ${event.reason}`)
            //     );
            // });

            const timeout = options?.timeoutMs || 30_000;

            try {
                let waitForPromise: Promise<any> | undefined;
                let gotoPromise: Promise<PageSnapshot | any | null | void>;

                gotoPromise = page.goto(url, {
                    waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
                    timeout,
                })
                .catch((err: any) => {
                    if (err.name === 'TimeoutError' || err.message?.includes('ERR_NAME_NOT_RESOLVED') || err.message?.includes('Navigation timeout')) {
                        this.logger.warn(`Page ${sn}: Browsing of ${url} failed`, { err: marshalErrorLike(err) });
                        return {
                            title: 'Error: Unable to access page',
                            href: url,
                            html: '',
                            text: err.message,
                            screenshot,
                            pageshot,
                            error: err.message
                        } as PageSnapshot;
                    } else {
                        throw err;
                    }
                });

                if (Array.isArray(options?.waitForSelector)) {
                    if (options!.waitForSelector!.length === 1) {
                        console.log('Waiting for selector', options.waitForSelector);
                        try {
                            waitForPromise = page!.waitForSelector(options.waitForSelector[0], { timeout });
                        } catch (err: any) {
                            this.logger.warn(`Page ${sn}: Could not wait for selector`, { err: marshalErrorLike(err) });
                        }
                    } else if (options!.waitForSelector!.length > 1) {
                        try {
                            waitForPromise = Promise.race(options.waitForSelector.map(selector => page!.waitForSelector(selector, { timeout })));
                        } catch (err: any) {
                            this.logger.warn(`Page ${sn}: Could not wait for any selector`, { err: marshalErrorLike(err) });
                        }
                    }
                } else if (typeof options?.waitForSelector === 'string') {
                    try {
                        waitForPromise = page.waitForSelector(options.waitForSelector, { timeout });
                    } catch (err: any) {
                        this.logger.warn(`Page ${sn}: Could not wait for selector`, { err: marshalErrorLike(err) });
                    }
                }

                if (waitForPromise) {
                    await Promise.all([gotoPromise, waitForPromise]);
                } else {
                    await gotoPromise;
                }

                let goodSnapshot = false;
                try {
                    const threshold = options?.favorScreenshot ? 0 : 200;
                    let waitCound = 0;
                    while (!snapshot || snapshot.text.length <= threshold) {
                        const nextSnapshot = await Promise.race([
                            nextSnapshotDeferred.promise,
                            delay(200)
                        ]);
                        waitCound++;
                        if (nextSnapshot) {
                            goodSnapshot = true;
                            break;
                        }
                        if (waitCound >= 50) {
                            break;
                        }
                    }
                } catch (err: any) {
                    if (err.constructor === SecurityCompromiseError) {
                        throw err;
                    }
                    this.logger.warn(`Page ${sn}: No snapshot available, moving on`, { err: marshalErrorLike(err) });
                    snapshot = {
                        title: 'Error: Scraping Failed',
                        href: url,
                        html: '',
                        text: '',
                        screenshot,
                        pageshot,
                        error: 'No snapshot available'
                    } as PageSnapshot;
                }

                if (snapshot) {
                    this.logger.info(`Page ${sn}: Snapshot of ${url} done`, { url, title: snapshot.title, href: snapshot.href });
                    yield snapshot;
                }

                if (!goodSnapshot) {
                    try {
                        screenshot = await page.screenshot() as Buffer;
                        pageshot = await page.screenshot({ fullPage: true }) as Buffer;
                        const title = await page.title().catch(() => 'Failed to get title');

                        yield {
                            title,
                            href: url,
                            html: '',
                            text: '',
                            screenshot,
                            pageshot,
                            error: 'Screenshot only'
                        } as PageSnapshot;
                    } catch (err: any) {
                        this.logger.warn(`Page ${sn}: Failed to take screenshot`, { err: marshalErrorLike(err) });
                    }
                }

            } catch (error: any) {
                this.logger.error(`Page ${sn}: Error during scraping`, { error: marshalErrorLike(error) });
                yield {
                    title: 'Error: Scraping failed',
                    href: url,
                    html: '',
                    text: error.message || 'Unknown error',
                    screenshot,
                    pageshot,
                    error: error.message || 'Unknown error'
                } as PageSnapshot;
            } finally {
                this.snapshotHandlers.delete(page);
                // Clean up event listeners
                // page.removeAllListeners('abuse');
            }

        } catch (error: any) {
            this.logger.error(`Failed to get page for scraping ${url}:`, { error: marshalErrorLike(error) });
            yield {
                title: 'Error: Failed to get page',
                href: url,
                html: '',
                text: error.message || 'Failed to get page',
                screenshot,
                pageshot,
                error: error.message || 'Failed to get page'
            } as PageSnapshot;
        } finally {
            // Always release the page back to the pool
            if (page) {
                this.releasePage(page);
            }
        }
    }

    async salvage(url: string, page: Page) {
        this.logger.info(`Salvaging ${url}`);
        const googleArchiveUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
        const resp = await fetch(googleArchiveUrl, {
            headers: {
                'User-Agent': `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)`
            }
        });
        resp.body?.cancel().catch(() => void 0);
        if (!resp.ok) {
            this.logger.warn(`No salvation found for url: ${url}`, { status: resp.status, url });
            return null;
        }

        await page.goto(googleArchiveUrl, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'], timeout: 15_000 }).catch((err: any) => {
            this.logger.warn(`Page salvation did not fully succeed.`, { err: marshalErrorLike(err) });
        });

        this.logger.info(`Salvation completed.`);

        return true;
    }

    async snapshotChildFrames(page: Page): Promise<PageSnapshot[]> {
        const childFrames = page.mainFrame().childFrames();
        const r = await Promise.all(childFrames.map(async (x: any) => {
            const thisUrl = x.url();
            if (!thisUrl || thisUrl === 'about:blank') {
                return undefined;
            }
            try {
                await x.evaluate(SCRIPT_TO_INJECT_INTO_FRAME);

                return await x.evaluate(`giveSnapshot()`);
            } catch (err) {
                this.logger.warn(`Failed to snapshot child frame ${thisUrl}`, { err });
                return undefined;
            }
        })) as PageSnapshot[];

        return r.filter(Boolean);
    }
}

const puppeteerControl = container.resolve(PuppeteerControl);

export default puppeteerControl;