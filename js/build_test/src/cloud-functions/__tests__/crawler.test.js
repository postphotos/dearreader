
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
const mockPuppeteerControl = {
  scrape: async function* (url) {
    console.log("Mock scrape called with URL:", url.href);
    if (url.href.includes("ala.org")) {
      yield {
        title: "American Library Association",
        href: url.toString(),
        html: `
          <html>
            <head><title>American Library Association</title></head>
            <body>
              <h1>American Library Association</h1>
              <p>The American Library Association is the foremost national organization providing resources to inspire library and information professionals to transform their communities through essential learning and access to information.</p>
              <a href="https://www.ala.org/aboutala/">About ALA</a>
              <a href="https://www.ala.org/advocacy/">Advocacy</a>
              <img src="https://www.ala.org/images/logo.png" alt="ALA Logo">
            </body>
          </html>
        `,
        text: "American Library Association\n\nThe American Library Association is the foremost national organization providing resources to inspire library and information professionals to transform their communities through essential learning and access to information.\nAbout ALA\nAdvocacy",
        parsed: {
          title: "American Library Association",
          content: "The American Library Association is the foremost national organization providing resources to inspire library and information professionals to transform their communities through essential learning and access to information.",
          excerpt: "The American Library Association is the foremost national organization providing resources to inspire library and information professionals to transform their communities through essential learning and access to information.",
          lang: "en",
          siteName: "American Library Association",
          byline: "ALA Staff",
          publishedTime: "2023-01-01"
        },
        imgs: [{
          src: "https://www.ala.org/images/logo.png",
          width: 200,
          height: 100,
          alt: "ALA Logo"
        }]
      };
    } else if (url.href.includes("worldliteracyfoundation.org")) {
      yield {
        title: "World Literacy Foundation",
        href: url.toString(),
        html: `
          <html>
            <head><title>World Literacy Foundation</title></head>
            <body>
              <h1>World Literacy Foundation</h1>
              <p>The World Literacy Foundation is dedicated to improving literacy rates worldwide through innovative programs and partnerships.</p>
              <a href="https://worldliteracyfoundation.org/programs/">Programs</a>
              <a href="https://worldliteracyfoundation.org/impact/">Impact</a>
            </body>
          </html>
        `,
        text: "World Literacy Foundation\n\nThe World Literacy Foundation is dedicated to improving literacy rates worldwide through innovative programs and partnerships.\nPrograms\nImpact",
        parsed: {
          title: "World Literacy Foundation",
          content: "The World Literacy Foundation is dedicated to improving literacy rates worldwide through innovative programs and partnerships.",
          excerpt: "The World Literacy Foundation is dedicated to improving literacy rates worldwide through innovative programs and partnerships.",
          lang: "en",
          siteName: "World Literacy Foundation",
          byline: "WLF Team",
          publishedTime: "2023-01-01"
        },
        imgs: []
      };
    } else if (url.href.includes("wikipedia.org")) {
      yield {
        title: "Reading - Wikipedia",
        href: url.toString(),
        html: `
          <html>
            <head><title>Reading - Wikipedia</title></head>
            <body>
              <h1>Reading</h1>
              <p>Reading is the process of taking in the sense or meaning of letters, symbols, etc., especially by sight or touch.</p>
              <p>For other uses, see <a href="/wiki/Reading_(disambiguation)">Reading (disambiguation)</a>.</p>
            </body>
          </html>
        `,
        text: "Reading - Wikipedia\n\nReading is the process of taking in the sense or meaning of letters, symbols, etc., especially by sight or touch.\n\nFor other uses, see Reading (disambiguation).",
        parsed: {
          title: "Reading - Wikipedia",
          content: "Reading is the process of taking in the sense or meaning of letters, symbols, etc., especially by sight or touch. For other uses, see Reading (disambiguation).",
          excerpt: "Reading is the process of taking in the sense or meaning of letters, symbols, etc., especially by sight or touch.",
          lang: "en",
          siteName: "Wikipedia",
          byline: "Wikipedia Contributors",
          publishedTime: "2023-01-01"
        },
        imgs: []
      };
    } else {
      yield {
        title: "Test Page",
        href: url.toString(),
        html: `<html><head><title>Test Page</title></head><body><h1>Test Page</h1><p>This is a test page.</p></body></html>`,
        text: "Test Page\n\nThis is a test page.",
        parsed: {
          title: "Test Page",
          content: "This is a test page.",
          excerpt: "This is a test page.",
          lang: "en",
          siteName: "Test Site",
          byline: "Test Author",
          publishedTime: "2023-01-01"
        },
        imgs: []
      };
    }
  },
  circuitBreakerHosts: /* @__PURE__ */ new Set(),
  on: () => {
  },
  emit: () => {
  }
};
const mockJSDomControl = {
  inferSnapshot: (snapshot) => ({
    ...snapshot,
    links: {
      "https://www.ala.org/aboutala/": "About ALA",
      "https://www.ala.org/advocacy/": "Advocacy",
      "https://worldliteracyfoundation.org/programs/": "Programs",
      "https://worldliteracyfoundation.org/impact/": "Impact",
      "https://en.wikipedia.org/wiki/Reading_(disambiguation)": "Reading (disambiguation)"
    }
  }),
  narrowSnapshot: (snapshot) => snapshot,
  snippetToElement: (snippet) => ({
    querySelectorAll: () => [],
    innerHTML: snippet || "",
    textContent: snippet || ""
  }),
  runTurndown: () => "Title: World Literacy Foundation\n\nThe World Literacy Foundation is dedicated to improving literacy rates worldwide through innovative programs and partnerships.\n\nLinks/Buttons:\n[Programs](https://worldliteracyfoundation.org/programs/)\n[Impact](https://worldliteracyfoundation.org/impact/)"
};
const mockPDFExtractor = {
  extract: async () => ({ content: "Mock PDF content" })
};
const mockRobotsChecker = {
  check: async () => true
};
const mockFirebaseStorage = {};
const mockThreadLocal = {
  _data: /* @__PURE__ */ new Map(),
  get: function(key) {
    return this._data.get(key);
  },
  set: function(key, value) {
    this._data.set(key, value);
  }
};
class MockResponse {
  constructor() {
    this._headers = {};
  }
  status(code) {
    this._status = code;
    return this;
  }
  type(contentType) {
    this._contentType = contentType;
    return this;
  }
  setHeader(key, value) {
    this._headers[key] = value;
    return this;
  }
  send(data) {
    if (this._contentType === "application/json") {
      this._data = data;
    } else if (data && typeof data === "object" && typeof data.toString === "function") {
      this._data = data.toString();
    } else {
      this._data = data;
    }
    return this;
  }
  getStatus() {
    return this._status;
  }
  getData() {
    return this._data;
  }
  getHeaders() {
    return this._headers;
  }
  getContentType() {
    return this._contentType;
  }
}
describe("CrawlerHost JSON Response Format", () => {
  it("should return JSON response with links and markdown content", async () => {
    const { CrawlerHost } = await import("../crawler.js");
    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );
    const mockReq = {
      url: "/https://www.ala.org",
      method: "GET",
      query: {},
      headers: {
        accept: "application/json"
      },
      hostname: "localhost"
    };
    const mockRes = new MockResponse();
    await crawlerHost.crawl(mockReq, mockRes);
    const responseData = mockRes.getData();
    expect(responseData).to.have.property("code", 200);
    expect(responseData).to.have.property("status", 2e4);
    expect(responseData).to.have.property("data");
    const data = responseData.data;
    expect(data).to.have.property("title", "American Library Association");
    expect(data).to.have.property("description").that.is.a("string");
    expect(data).to.have.property("url").that.includes("https://www.ala.org");
    expect(data).to.have.property("content").that.is.a("string");
    expect(data).to.have.property("links").that.is.an("object");
    expect(data.links).to.have.property("https://www.ala.org/aboutala/", "About ALA");
    expect(data.links).to.have.property("https://www.ala.org/advocacy/", "Advocacy");
    expect(data).to.have.property("images").that.is.an("object");
    expect(data).to.have.property("metadata").that.is.an("object");
    expect(data.metadata).to.have.property("lang", "en");
    expect(data.metadata).to.have.property("description");
    expect(data.metadata).to.have.property("og:title", "American Library Association");
    expect(data.metadata).to.have.property("og:site_name", "American Library Association");
    expect(data.metadata).to.have.property("article:author", "ALA Staff");
    expect(data.metadata).to.have.property("article:published_time", "2023-01-01");
  });
  it("should handle markdown content in JSON response", async () => {
    const { CrawlerHost } = await import("../crawler.js");
    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );
    const mockReq = {
      url: "/https://worldliteracyfoundation.org",
      method: "GET",
      query: {},
      headers: {
        accept: "application/json"
      },
      hostname: "localhost"
    };
    const mockRes = new MockResponse();
    await crawlerHost.crawl(mockReq, mockRes);
    const responseData = mockRes.getData();
    expect(responseData.data.content).to.be.a("string");
    expect(responseData.data.content.length).to.be.greaterThan(0);
  });
});
describe("CrawlerHost Markdown Response Format", () => {
  it("should return markdown response with links", async () => {
    const { CrawlerHost } = await import("../crawler.js");
    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );
    const mockReq = {
      url: "/https://worldliteracyfoundation.org",
      method: "GET",
      query: {
        withLinksSummary: "true"
      },
      headers: {
        accept: "text/plain",
        "x-with-links-summary": "true"
      },
      hostname: "localhost"
    };
    mockThreadLocal.set("withLinksSummary", true);
    const mockRes = new MockResponse();
    await crawlerHost.crawl(mockReq, mockRes);
    const responseData = mockRes.getData();
    expect(responseData).to.include("World Literacy Foundation");
    expect(responseData).to.include("Links/Buttons:");
    expect(responseData).to.include("[Programs](https://worldliteracyfoundation.org/programs/)");
    expect(responseData).to.include("[Impact](https://worldliteracyfoundation.org/impact/)");
  });
});
describe("CrawlerHost Error Handling", () => {
  it("should handle invalid URLs", async () => {
    const { CrawlerHost } = await import("../crawler.js");
    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );
    const mockReq = {
      url: "/invalid-url",
      method: "GET",
      query: {},
      headers: {
        accept: "application/json"
      },
      hostname: "localhost"
    };
    const mockRes = new MockResponse();
    await crawlerHost.crawl(mockReq, mockRes);
    expect(mockRes.getStatus()).to.equal(400);
    expect(mockRes.getData()).to.equal("Invalid URL or TLD");
  });
  it("should handle favicon requests", async () => {
    const { CrawlerHost } = await import("../crawler.js");
    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );
    const mockReq = {
      url: "/favicon.ico",
      method: "GET",
      query: {},
      headers: {},
      hostname: "localhost"
    };
    const mockRes = new MockResponse();
    await crawlerHost.crawl(mockReq, mockRes);
    expect(mockRes.getStatus()).to.equal(404);
    expect(mockRes.getData()).to.equal("Favicon not available");
  });
});
describe("CrawlerHost Index Page", () => {
  it("should return index page for root requests", async () => {
    const { CrawlerHost } = await import("../crawler.js");
    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );
    const mockReq = {
      url: "/",
      method: "GET",
      query: {},
      headers: {
        accept: "text/plain"
      },
      hostname: "localhost",
      get: (header) => {
        if (header === "host") return "localhost:3000";
        if (header === "x-forwarded-proto") return "http";
        return void 0;
      },
      protocol: "http"
    };
    const mockRes = new MockResponse();
    mockThreadLocal.set("withLinksSummary", false);
    await crawlerHost.crawl(mockReq, mockRes);
    const responseData = mockRes.getData();
    const responseString = typeof responseData === "string" ? responseData : responseData?.toString?.() || JSON.stringify(responseData);
    expect(responseString).to.include("DearReader API - Local Web Content Extractor");
    expect(responseString).to.include("Convert any URL to LLM-friendly content");
    expect(responseString).to.include("/https://example.com");
  });
});
//# sourceMappingURL=crawler.test.js.map
