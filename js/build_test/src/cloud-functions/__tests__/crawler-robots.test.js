
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

import { expect } from "chai";
import { CrawlerHost } from "../crawler.js";
describe("CrawlerHost Robots Checker Edge Cases", () => {
  it("should proceed when robotsChecker is missing methods", async () => {
    const crawler = new CrawlerHost(
      // minimal mocks: puppeteerControl, jsdomControl, pdfExtractor, robotsChecker, storage, threadLocal
      { scrape: async function* (_) {
        yield { title: "X", href: "http://example/", html: "<html></html>", text: "X", parsed: { title: "X", content: "X", excerpt: "X" }, imgs: [] };
      }, _sn: "mock", browser: null, logger: console, startTime: Date.now(), circuitBreakerHosts: /* @__PURE__ */ new Set(), on: () => {
      }, emit: () => {
      } },
      { inferSnapshot: (s) => s, narrowSnapshot: (s) => s, runTurndown: () => "ok" },
      { extract: async () => ({ content: "pdf" }) },
      // robotsChecker provided but without isAllowed/getCrawlDelay
      { check: async () => true },
      {},
      { _data: /* @__PURE__ */ new Map(), get: () => void 0, set: () => {
      } }
    );
    const req = { url: "/https://www.ala.org", method: "GET", query: {}, headers: { accept: "application/json" }, hostname: "localhost" };
    const res = { _status: 200, _data: null, status(code) {
      this._status = code;
      return this;
    }, type() {
      return this;
    }, send(data) {
      this._data = data;
    } };
    await crawler.crawl(req, res);
    expect(res._data).to.exist;
  });
});
//# sourceMappingURL=crawler-robots.test.js.map
