"use strict";
// Mock implementation for Puppeteer when Chromium is not available
// This allows tests to run even in environments without proper browser setup
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockAddExtra = exports.mockPuppeteer = void 0;
// Mock Page implementation
class MockPage {
    constructor() {
        this.cookies = [];
        this.userAgent = 'MockBrowser/1.0';
    }
    async setBypassCSP(enabled) {
        // Mock implementation
    }
    async setViewport(viewport) {
        // Mock implementation
    }
    async exposeFunction(name, fn) {
        // Mock implementation
    }
    async evaluateOnNewDocument(script) {
        // Mock implementation
    }
    async setRequestInterception(enabled) {
        // Mock implementation
    }
    async goto(url, options) {
        return { status: () => 200 };
    }
    async evaluate(script) {
        // Return mock data based on the script
        if (typeof script === 'string') {
            if (script.includes('document.title')) {
                return 'Reading is Fundamental';
            }
            if (script.includes('document.body.innerText')) {
                return 'Mock content for testing purposes.';
            }
            if (script.includes('document.body.innerHTML')) {
                return '<html><body><h1>Mock HTML Content</h1><p>This is test content.</p></body></html>';
            }
            if (script.includes('giveSnapshot')) {
                return {
                    title: 'Reading is Fundamental',
                    href: 'https://example.com',
                    html: '<html><body><h1>Mock Content</h1></body></html>',
                    text: 'Mock content for testing purposes.',
                    parsed: {
                        title: 'Reading is Fundamental',
                        content: '<p>Mock content for testing purposes.</p>',
                        textContent: 'Mock content for testing purposes.',
                        length: 35,
                        excerpt: 'Mock content for testing purposes.',
                        byline: '',
                        dir: 'ltr',
                        siteName: 'Example Site',
                        lang: 'en',
                        publishedTime: ''
                    },
                    imgs: [],
                    pdfs: [],
                    maxElemDepth: 3,
                    elemCount: 5
                };
            }
        }
        return {};
    }
    async content() {
        return `
      <html>
        <head><title>Reading is Fundamental</title></head>
        <body>
          <h1>Welcome to the Reading Community</h1>
          <p>Books open doors to new worlds.</p>
          <a href="https://www.ala.org/advocacy/reading">Reading Resources</a>
        </body>
      </html>
    `;
    }
    async screenshot(options) {
        return Buffer.from('mock-screenshot');
    }
    async close() {
        // Mock implementation
    }
    async waitForSelector(selector, options) {
        // Mock implementation - return a mock element
        return {};
    }
    async waitForTimeout(ms) {
        return new Promise(resolve => setTimeout(resolve, Math.min(ms, 100))); // Fast mock
    }
    async setCookie(...cookies) {
        this.cookies.push(...cookies);
    }
    async setUserAgent(userAgent) {
        this.userAgent = userAgent;
    }
    async title() {
        return 'Reading is Fundamental';
    }
    on(event, handler) {
        // Mock event listener
    }
    emit(event, ...args) {
        // Mock event emitter
    }
    browserContext() {
        return new MockBrowserContext();
    }
    mainFrame() {
        return {
            childFrames: () => []
        };
    }
    isClosed() {
        return false;
    }
}
// Mock BrowserContext implementation
class MockBrowserContext {
    async newPage() {
        return new MockPage();
    }
    async close() {
        // Mock implementation
    }
    async pages() {
        return [new MockPage()];
    }
}
// Mock Browser implementation
class MockBrowser {
    constructor() {
        this.pages = [];
        this.connected = true;
    }
    async newPage() {
        const page = new MockPage();
        this.pages.push(page);
        return page;
    }
    defaultBrowserContext() {
        return new MockBrowserContext();
    }
    async close() {
        // Mock implementation
    }
    process() {
        return { pid: 12345, kill: () => { } };
    }
    on(event, handler) {
        // Mock event listener
    }
    once(event, handler) {
        // Mock event listener
    }
    emit(event, ...args) {
        // Mock event emitter
    }
}
// Mock Puppeteer launch function
const mockPuppeteerLaunch = async (options) => {
    return new MockBrowser();
};
// Mock puppeteer-extra addExtra function
const createMockAddExtra = (puppeteer) => {
    return {
        ...puppeteer,
        launch: mockPuppeteerLaunch,
        use: () => { } // Mock plugin system
    };
};
// Export the mock implementations
exports.mockPuppeteer = {
    launch: mockPuppeteerLaunch
};
exports.mockAddExtra = createMockAddExtra;
exports.default = exports.mockPuppeteer;
//# sourceMappingURL=mock-puppeteer.js.map