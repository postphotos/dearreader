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
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
// Mock dependencies
const mockPuppeteerControl = {
    scrape: async function* (url) {
        console.log('Mock scrape called with URL:', url.href);
        // Mock real website content
        if (url.href.includes('ala.org')) {
            yield {
                title: 'American Library Association',
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
                text: 'American Library Association\n\nThe American Library Association is the foremost national organization providing resources to inspire library and information professionals to transform their communities through essential learning and access to information.\nAbout ALA\nAdvocacy',
                parsed: {
                    title: 'American Library Association',
                    content: 'The American Library Association is the foremost national organization providing resources to inspire library and information professionals to transform their communities through essential learning and access to information.',
                    excerpt: 'The American Library Association is the foremost national organization providing resources to inspire library and information professionals to transform their communities through essential learning and access to information.',
                    lang: 'en',
                    siteName: 'American Library Association',
                    byline: 'ALA Staff',
                    publishedTime: '2023-01-01'
                },
                imgs: [{
                        src: 'https://www.ala.org/images/logo.png',
                        width: 200,
                        height: 100,
                        alt: 'ALA Logo'
                    }]
            };
        }
        else if (url.href.includes('worldliteracyfoundation.org')) {
            yield {
                title: 'World Literacy Foundation',
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
                text: 'World Literacy Foundation\n\nThe World Literacy Foundation is dedicated to improving literacy rates worldwide through innovative programs and partnerships.\nPrograms\nImpact',
                parsed: {
                    title: 'World Literacy Foundation',
                    content: 'The World Literacy Foundation is dedicated to improving literacy rates worldwide through innovative programs and partnerships.',
                    excerpt: 'The World Literacy Foundation is dedicated to improving literacy rates worldwide through innovative programs and partnerships.',
                    lang: 'en',
                    siteName: 'World Literacy Foundation',
                    byline: 'WLF Team',
                    publishedTime: '2023-01-01'
                },
                imgs: []
            };
        }
        else if (url.href.includes('wikipedia.org')) {
            yield {
                title: 'Reading - Wikipedia',
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
                text: 'Reading - Wikipedia\n\nReading is the process of taking in the sense or meaning of letters, symbols, etc., especially by sight or touch.\n\nFor other uses, see Reading (disambiguation).',
                parsed: {
                    title: 'Reading - Wikipedia',
                    content: 'Reading is the process of taking in the sense or meaning of letters, symbols, etc., especially by sight or touch. For other uses, see Reading (disambiguation).',
                    excerpt: 'Reading is the process of taking in the sense or meaning of letters, symbols, etc., especially by sight or touch.',
                    lang: 'en',
                    siteName: 'Wikipedia',
                    byline: 'Wikipedia Contributors',
                    publishedTime: '2023-01-01'
                },
                imgs: []
            };
        }
        else {
            // Default fallback
            yield {
                title: 'Test Page',
                href: url.toString(),
                html: `<html><head><title>Test Page</title></head><body><h1>Test Page</h1><p>This is a test page.</p></body></html>`,
                text: 'Test Page\n\nThis is a test page.',
                parsed: {
                    title: 'Test Page',
                    content: 'This is a test page.',
                    excerpt: 'This is a test page.',
                    lang: 'en',
                    siteName: 'Test Site',
                    byline: 'Test Author',
                    publishedTime: '2023-01-01'
                },
                imgs: []
            };
        }
    },
    circuitBreakerHosts: new Set(),
    on: () => { },
    emit: () => { }
};
const mockJSDomControl = {
    inferSnapshot: (snapshot) => ({
        ...snapshot,
        links: {
            'https://www.ala.org/aboutala/': 'About ALA',
            'https://www.ala.org/advocacy/': 'Advocacy',
            'https://worldliteracyfoundation.org/programs/': 'Programs',
            'https://worldliteracyfoundation.org/impact/': 'Impact',
            'https://en.wikipedia.org/wiki/Reading_(disambiguation)': 'Reading (disambiguation)'
        }
    }),
    narrowSnapshot: (snapshot) => snapshot,
    snippetToElement: (snippet) => ({
        querySelectorAll: () => [],
        innerHTML: snippet || '',
        textContent: snippet || ''
    }),
    runTurndown: () => 'Title: World Literacy Foundation\n\nThe World Literacy Foundation is dedicated to improving literacy rates worldwide through innovative programs and partnerships.\n\nLinks/Buttons:\n[Programs](https://worldliteracyfoundation.org/programs/)\n[Impact](https://worldliteracyfoundation.org/impact/)'
};
const mockPDFExtractor = {
    extract: async () => ({ content: 'Mock PDF content' })
};
const mockRobotsChecker = {
    check: async () => true
};
const mockFirebaseStorage = {};
const mockThreadLocal = {
    _data: new Map(),
    get: function (key) {
        return this._data.get(key);
    },
    set: function (key, value) {
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
        // For JSON responses, don't call toString
        if (this._contentType === 'application/json') {
            this._data = data;
        }
        else if (data && typeof data === 'object' && typeof data.toString === 'function') {
            this._data = data.toString();
        }
        else {
            this._data = data;
        }
        return this;
    }
    getStatus() { return this._status; }
    getData() { return this._data; }
    getHeaders() { return this._headers; }
    getContentType() { return this._contentType; }
}
// Test suite using proper mocha functions
describe('CrawlerHost JSON Response Format', () => {
    it('should return JSON response with links and markdown content', async () => {
        // Import here to avoid circular dependencies
        const { CrawlerHost } = await Promise.resolve().then(() => __importStar(require('../crawler.js')));
        const crawlerHost = new CrawlerHost(mockPuppeteerControl, mockJSDomControl, mockPDFExtractor, mockRobotsChecker, mockFirebaseStorage, mockThreadLocal);
        const mockReq = {
            url: '/https://www.ala.org',
            method: 'GET',
            query: {},
            headers: {
                accept: 'application/json'
            },
            hostname: 'localhost'
        };
        const mockRes = new MockResponse();
        await crawlerHost.crawl(mockReq, mockRes);
        const responseData = mockRes.getData();
        // Verify response structure
        (0, chai_1.expect)(responseData).to.have.property('code', 200);
        (0, chai_1.expect)(responseData).to.have.property('status', 20000);
        (0, chai_1.expect)(responseData).to.have.property('data');
        const data = responseData.data;
        (0, chai_1.expect)(data).to.have.property('title', 'American Library Association');
        (0, chai_1.expect)(data).to.have.property('description').that.is.a('string');
        (0, chai_1.expect)(data).to.have.property('url').that.includes('https://www.ala.org');
        (0, chai_1.expect)(data).to.have.property('content').that.is.a('string');
        (0, chai_1.expect)(data).to.have.property('links').that.is.an('object');
        // Verify links are included
        (0, chai_1.expect)(data.links).to.have.property('https://www.ala.org/aboutala/', 'About ALA');
        (0, chai_1.expect)(data.links).to.have.property('https://www.ala.org/advocacy/', 'Advocacy');
        // Verify images are included
        (0, chai_1.expect)(data).to.have.property('images').that.is.an('object');
        // Verify metadata
        (0, chai_1.expect)(data).to.have.property('metadata').that.is.an('object');
        (0, chai_1.expect)(data.metadata).to.have.property('lang', 'en');
        (0, chai_1.expect)(data.metadata).to.have.property('description');
        (0, chai_1.expect)(data.metadata).to.have.property('og:title', 'American Library Association');
        (0, chai_1.expect)(data.metadata).to.have.property('og:site_name', 'American Library Association');
        (0, chai_1.expect)(data.metadata).to.have.property('article:author', 'ALA Staff');
        (0, chai_1.expect)(data.metadata).to.have.property('article:published_time', '2023-01-01');
    });
    it('should handle markdown content in JSON response', async () => {
        const { CrawlerHost } = await Promise.resolve().then(() => __importStar(require('../crawler.js')));
        const crawlerHost = new CrawlerHost(mockPuppeteerControl, mockJSDomControl, mockPDFExtractor, mockRobotsChecker, mockFirebaseStorage, mockThreadLocal);
        const mockReq = {
            url: '/https://worldliteracyfoundation.org',
            method: 'GET',
            query: {},
            headers: {
                accept: 'application/json'
            },
            hostname: 'localhost'
        };
        const mockRes = new MockResponse();
        await crawlerHost.crawl(mockReq, mockRes);
        const responseData = mockRes.getData();
        // Verify that content includes markdown formatting
        (0, chai_1.expect)(responseData.data.content).to.be.a('string');
        (0, chai_1.expect)(responseData.data.content.length).to.be.greaterThan(0);
    });
});
describe('CrawlerHost Markdown Response Format', () => {
    it('should return markdown response with links', async () => {
        const { CrawlerHost } = await Promise.resolve().then(() => __importStar(require('../crawler.js')));
        const crawlerHost = new CrawlerHost(mockPuppeteerControl, mockJSDomControl, mockPDFExtractor, mockRobotsChecker, mockFirebaseStorage, mockThreadLocal);
        const mockReq = {
            url: '/https://worldliteracyfoundation.org',
            method: 'GET',
            query: {
                withLinksSummary: 'true'
            },
            headers: {
                accept: 'text/plain',
                'x-with-links-summary': 'true'
            },
            hostname: 'localhost'
        };
        // Ensure links are included in the response
        mockThreadLocal.set('withLinksSummary', true);
        const mockRes = new MockResponse();
        await crawlerHost.crawl(mockReq, mockRes);
        const responseData = mockRes.getData();
        // Verify content includes title and links
        (0, chai_1.expect)(responseData).to.include('World Literacy Foundation');
        (0, chai_1.expect)(responseData).to.include('Links/Buttons:');
        (0, chai_1.expect)(responseData).to.include('[Programs](https://worldliteracyfoundation.org/programs/)');
        (0, chai_1.expect)(responseData).to.include('[Impact](https://worldliteracyfoundation.org/impact/)');
    });
});
describe('CrawlerHost Error Handling', () => {
    it('should handle invalid URLs', async () => {
        const { CrawlerHost } = await Promise.resolve().then(() => __importStar(require('../crawler.js')));
        const crawlerHost = new CrawlerHost(mockPuppeteerControl, mockJSDomControl, mockPDFExtractor, mockRobotsChecker, mockFirebaseStorage, mockThreadLocal);
        const mockReq = {
            url: '/invalid-url',
            method: 'GET',
            query: {},
            headers: {
                accept: 'application/json'
            },
            hostname: 'localhost'
        };
        const mockRes = new MockResponse();
        await crawlerHost.crawl(mockReq, mockRes);
        (0, chai_1.expect)(mockRes.getStatus()).to.equal(400);
        (0, chai_1.expect)(mockRes.getData()).to.equal('Invalid URL or TLD');
    });
    it('should handle favicon requests', async () => {
        const { CrawlerHost } = await Promise.resolve().then(() => __importStar(require('../crawler.js')));
        const crawlerHost = new CrawlerHost(mockPuppeteerControl, mockJSDomControl, mockPDFExtractor, mockRobotsChecker, mockFirebaseStorage, mockThreadLocal);
        const mockReq = {
            url: '/favicon.ico',
            method: 'GET',
            query: {},
            headers: {},
            hostname: 'localhost'
        };
        const mockRes = new MockResponse();
        await crawlerHost.crawl(mockReq, mockRes);
        (0, chai_1.expect)(mockRes.getStatus()).to.equal(404);
        (0, chai_1.expect)(mockRes.getData()).to.equal('Favicon not available');
    });
});
describe('CrawlerHost Index Page', () => {
    it('should return index page for root requests', async () => {
        const { CrawlerHost } = await Promise.resolve().then(() => __importStar(require('../crawler.js')));
        const crawlerHost = new CrawlerHost(mockPuppeteerControl, mockJSDomControl, mockPDFExtractor, mockRobotsChecker, mockFirebaseStorage, mockThreadLocal);
        const mockReq = {
            url: '/',
            method: 'GET',
            query: {},
            headers: {
                accept: 'text/plain'
            },
            hostname: 'localhost',
            get: (header) => {
                if (header === 'host')
                    return 'localhost:3000';
                if (header === 'x-forwarded-proto')
                    return 'http';
                return undefined;
            },
            protocol: 'http'
        };
        const mockRes = new MockResponse();
        // Ensure withLinksSummary is not set
        mockThreadLocal.set('withLinksSummary', false);
        await crawlerHost.crawl(mockReq, mockRes);
        const responseData = mockRes.getData();
        // Handle both string and object responses
        const responseString = typeof responseData === 'string' ? responseData : responseData?.toString?.() || JSON.stringify(responseData);
        (0, chai_1.expect)(responseString).to.include('DearReader API - Local Web Content Extractor');
        (0, chai_1.expect)(responseString).to.include('Convert any URL to LLM-friendly content');
        (0, chai_1.expect)(responseString).to.include('/https://example.com');
    });
});
//# sourceMappingURL=crawler.test.js.map