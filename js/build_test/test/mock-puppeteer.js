
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

class MockPage {
  constructor() {
    this.cookies = [];
    this.userAgent = "MockBrowser/1.0";
  }
  async setBypassCSP(enabled) {
  }
  async setViewport(viewport) {
  }
  async exposeFunction(name, fn) {
  }
  async evaluateOnNewDocument(script) {
  }
  async setRequestInterception(enabled) {
  }
  async goto(url, options) {
    return { status: () => 200 };
  }
  async evaluate(script) {
    if (typeof script === "string") {
      if (script.includes("document.title")) {
        return "Reading is Fundamental";
      }
      if (script.includes("document.body.innerText")) {
        return "Mock content for testing purposes.";
      }
      if (script.includes("document.body.innerHTML")) {
        return "<html><body><h1>Mock HTML Content</h1><p>This is test content.</p></body></html>";
      }
      if (script.includes("giveSnapshot")) {
        return {
          title: "Reading is Fundamental",
          href: "https://example.com",
          html: "<html><body><h1>Mock Content</h1></body></html>",
          text: "Mock content for testing purposes.",
          parsed: {
            title: "Reading is Fundamental",
            content: "<p>Mock content for testing purposes.</p>",
            textContent: "Mock content for testing purposes.",
            length: 35,
            excerpt: "Mock content for testing purposes.",
            byline: "",
            dir: "ltr",
            siteName: "Example Site",
            lang: "en",
            publishedTime: ""
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
    return Buffer.from("mock-screenshot");
  }
  async close() {
  }
  async waitForSelector(selector, options) {
    return {};
  }
  async waitForTimeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.min(ms, 100)));
  }
  async setCookie(...cookies) {
    this.cookies.push(...cookies);
  }
  async setUserAgent(userAgent) {
    this.userAgent = userAgent;
  }
  async title() {
    return "Reading is Fundamental";
  }
  on(event, handler) {
  }
  emit(event, ...args) {
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
class MockBrowserContext {
  async newPage() {
    return new MockPage();
  }
  async close() {
  }
  async pages() {
    return [new MockPage()];
  }
}
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
  }
  process() {
    return { pid: 12345, kill: () => {
    } };
  }
  on(event, handler) {
  }
  once(event, handler) {
  }
  emit(event, ...args) {
  }
}
const mockPuppeteerLaunch = async (options) => {
  return new MockBrowser();
};
const createMockAddExtra = (puppeteer) => {
  return {
    ...puppeteer,
    launch: mockPuppeteerLaunch,
    use: () => {
    }
    // Mock plugin system
  };
};
const mockPuppeteer = {
  launch: mockPuppeteerLaunch
};
const mockAddExtra = createMockAddExtra;
var mock_puppeteer_default = mockPuppeteer;
export {
  mock_puppeteer_default as default,
  mockAddExtra,
  mockPuppeteer
};
//# sourceMappingURL=mock-puppeteer.js.map
