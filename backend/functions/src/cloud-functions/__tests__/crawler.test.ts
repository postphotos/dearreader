import { expect } from 'chai';

// Mock dependencies
const mockPuppeteerControl = {
  scrape: async function* (url: URL) {
    // Mock a simple page snapshot
    yield {
      title: 'Test Page',
      href: url.toString(),
      html: `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Test Page</h1>
            <p>This is a test page with some content.</p>
            <a href="https://example.com/link1">Link 1</a>
            <a href="https://example.com/link2">Link 2</a>
            <img src="https://example.com/image1.jpg" alt="Test Image">
          </body>
        </html>
      `,
      text: 'Test Page\n\nThis is a test page with some content.\nLink 1\nLink 2',
      parsed: {
        title: 'Test Page',
        content: 'This is a test page with some content.',
        excerpt: 'This is a test page with some content.',
        lang: 'en',
        siteName: 'Example Site',
        byline: 'Test Author',
        publishedTime: '2023-01-01'
      },
      imgs: [{
        src: 'https://example.com/image1.jpg',
        width: 800,
        height: 600,
        alt: 'Test Image'
      }]
    };
  },
  circuitBreakerHosts: new Set(),
  on: () => {},
  emit: () => {}
} as any;

const mockJSDomControl = {
  inferSnapshot: (snapshot: any) => ({
    ...snapshot,
    links: {
      'https://example.com/link1': 'Link 1',
      'https://example.com/link2': 'Link 2'
    }
  }),
  narrowSnapshot: (snapshot: any) => snapshot,
  snippetToElement: (snippet?: string) => {
    // Mock DOM element for testing
    return {
      querySelectorAll: () => [],
      innerHTML: snippet || '',
      textContent: snippet || ''
    };
  },
  runTurndown: () => '# Test Page\n\nThis is a test page with some content.\n\n[Link 1](https://example.com/link1)\n\n[Link 2](https://example.com/link2)\n\n![Test Image](https://example.com/image1.jpg)'
} as any;

const mockPDFExtractor = {
  extractFromBuffer: async () => ({ text: 'Sample PDF content', metadata: {} }),
  extractFromUrl: async () => ({ text: 'Sample PDF content', metadata: {} })
} as any;

const mockRobotsChecker = {
  isAllowed: async () => true,
  checkRobots: async () => ({ allowed: true, crawlDelay: 0 })
} as any;

const mockFirebaseStorage = {} as any;
const mockThreadLocal = {
  _data: new Map<string, any>(),
  get: function(key: string) {
    return this._data.get(key);
  },
  set: function(key: string, value: any) {
    this._data.set(key, value);
    return this;
  }
} as any;

// Mock Express Request with proper methods
class MockRequest {
  url: string;
  method: string = 'GET';
  query: any = {};
  headers: any = {};
  hostname: string = 'localhost';

  constructor(url: string) {
    this.url = url;
  }

  get(headerName: string) {
    if (headerName === 'host') return this.hostname + ':3000';
    if (headerName === 'x-forwarded-proto') return 'http';
    return this.headers[headerName.toLowerCase()];
  }
}

// Mock Express Response
class MockResponse {
  private _status?: number;
  private _data?: any;
  private _headers: { [key: string]: string } = {};
  private _contentType?: string;

  status(code: number) {
    this._status = code;
    return this;
  }

  type(contentType: string) {
    this._contentType = contentType;
    return this;
  }

  setHeader(key: string, value: string) {
    this._headers[key] = value;
    return this;
  }

  send(data: any) {
    // For JSON responses, don't call toString
    if (this._contentType === 'application/json') {
      this._data = data;
    } else if (data && typeof data === 'object' && typeof data.toString === 'function') {
      this._data = data.toString();
    } else {
      this._data = data;
    }
    return this;
  }  getStatus() { return this._status; }
  getData() { return this._data; }
  getHeaders() { return this._headers; }
  getContentType() { return this._contentType; }
}

// Test suite using proper mocha functions
describe('CrawlerHost JSON Response Format', () => {
  it('should return JSON response with links and markdown content', async () => {
    // Import here to avoid circular dependencies
    const { CrawlerHost } = await import('../crawler.js');
    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );

    const mockReq = new MockRequest('/https://example.com/test');
    mockReq.headers = {
      accept: 'application/json'
    };

    const mockRes = new MockResponse();

    await crawlerHost.crawl(mockReq as any, mockRes as any);

    const responseData = mockRes.getData();

    // Verify response structure
    expect(responseData).to.have.property('code', 200);
    expect(responseData).to.have.property('status', 20000);
    expect(responseData).to.have.property('data');

    const data = responseData.data;
    expect(data).to.have.property('title', 'Test Page');
    expect(data).to.have.property('description').that.is.a('string');
    expect(data).to.have.property('url').that.includes('https://example.com/test');
    expect(data).to.have.property('content').that.is.a('string');
    expect(data).to.have.property('links').that.is.an('object');

    // Verify links are included
    expect(data.links).to.have.property('https://example.com/link1', 'Link 1');
    expect(data.links).to.have.property('https://example.com/link2', 'Link 2');

    // Verify images are included
    expect(data).to.have.property('images').that.is.an('object');

    // Verify metadata
    expect(data).to.have.property('metadata').that.is.an('object');
    expect(data.metadata).to.have.property('lang', 'en');
    expect(data.metadata).to.have.property('description');
    expect(data.metadata).to.have.property('og:title', 'Test Page');
    expect(data.metadata).to.have.property('og:site_name', 'Example Site');
    expect(data.metadata).to.have.property('article:author', 'Test Author');
    expect(data.metadata).to.have.property('article:published_time', '2023-01-01');
  });

  it('should handle educational URLs with rich content', async () => {
    const { CrawlerHost } = await import('../crawler.js');

    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );

    const mockReq = {
      url: '/https://www.ala.org',
      method: 'GET',
      query: {},
      headers: {
        accept: 'application/json'
      },
      hostname: 'localhost'
    } as any;

    const mockRes = new MockResponse();

    await crawlerHost.crawl(mockReq, mockRes as any);

    const responseData = mockRes.getData();

    // Verify response structure for educational content
    expect(responseData).to.have.property('code', 200);
    expect(responseData).to.have.property('data');
    expect(responseData.data).to.have.property('links').that.is.an('object');
    expect(responseData.data).to.have.property('images').that.is.an('object');
    expect(responseData.data).to.have.property('content').that.is.a('string');
  });

  it('should handle robots.txt compliance when enabled', async () => {
    const { CrawlerHost } = await import('../crawler.js');

    // Set environment variable for robots.txt checking
    process.env.RESPECT_ROBOTS_TXT = 'true';

    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );

    const mockReq = {
      url: '/https://www.readingpartners.org',
      method: 'GET',
      query: {},
      headers: {
        accept: 'application/json'
      },
      hostname: 'localhost'
    } as any;

    const mockRes = new MockResponse();

    await crawlerHost.crawl(mockReq, mockRes as any);

    // Should still work for allowed URLs
    const responseData = mockRes.getData();
    expect(responseData).to.have.property('code', 200);

    // Clean up environment
    delete process.env.RESPECT_ROBOTS_TXT;
  });

  it('should validate and reject invalid URLs properly', async () => {
    const { CrawlerHost } = await import('../crawler.js');

    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );

    const mockReq = {
      url: '/invalid-url-without-protocol',
      method: 'GET',
      query: {},
      headers: {},
      hostname: 'localhost'
    } as any;

    const mockRes = new MockResponse();

    await crawlerHost.crawl(mockReq, mockRes as any);

    // Should return 400 for invalid URLs
    expect(mockRes.getStatus()).to.equal(400);
  });
});

describe('CrawlerHost Markdown Response Format', () => {
  it('should return markdown response with links', async () => {
    const { CrawlerHost } = await import('../crawler.js');

    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );

    const mockReq = {
      url: '/https://example.com/markdown-test',
      method: 'GET',
      query: {},
      headers: {
        accept: 'text/plain',
        'x-with-links-summary': 'true'
      },
      hostname: 'localhost'
    } as any;

    // Ensure links are included in the response
    mockThreadLocal.set('withLinksSummary', true);

    const mockRes = new MockResponse();

    await crawlerHost.crawl(mockReq, mockRes as any);

    const responseData = mockRes.getData();

    // Verify content includes title and links
    expect(responseData).to.include('Test Page');
    expect(responseData).to.include('Links/Buttons:');
    expect(responseData).to.include('https://example.com/link1');
    expect(responseData).to.include('https://example.com/link2');
  });
});

describe('CrawlerHost Error Handling', () => {
  it('should handle invalid URLs', async () => {
    const { CrawlerHost } = await import('../crawler.js');

    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );

    const mockReq = {
      url: '/invalid-url',
      method: 'GET',
      query: {},
      headers: {
        accept: 'application/json'
      },
      hostname: 'localhost'
    } as any;

    const mockRes = new MockResponse();

    await crawlerHost.crawl(mockReq, mockRes as any);

    expect(mockRes.getStatus()).to.equal(400);
    expect(mockRes.getData()).to.equal('Invalid URL or TLD');
  });

  it('should handle favicon requests', async () => {
    const { CrawlerHost } = await import('../crawler.js');

    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );

    const mockReq = {
      url: '/favicon.ico',
      method: 'GET',
      query: {},
      headers: {},
      hostname: 'localhost'
    } as any;

    const mockRes = new MockResponse();

    await crawlerHost.crawl(mockReq, mockRes as any);

    expect(mockRes.getStatus()).to.equal(404);
    expect(mockRes.getData()).to.equal('Favicon not available');
  });
});

describe('CrawlerHost Index Page', () => {
  it('should return index page for root requests', async () => {
    const { CrawlerHost } = await import('../crawler.js');

    const crawlerHost = new CrawlerHost(
      mockPuppeteerControl,
      mockJSDomControl,
      mockPDFExtractor,
      mockRobotsChecker,
      mockFirebaseStorage,
      mockThreadLocal
    );

    const mockReq = new MockRequest('/');
    mockReq.method = 'GET';
    mockReq.query = {};
    mockReq.headers = {
      accept: 'text/plain'
    };
    mockReq.hostname = 'localhost';

    const mockRes = new MockResponse();

    // Ensure withLinksSummary is not set
    mockThreadLocal.set('withLinksSummary', false);

    await crawlerHost.crawl(mockReq as any, mockRes as any);

    const responseData = mockRes.getData();

    // Handle both string and object responses
    const responseString = typeof responseData === 'string' ? responseData : responseData?.toString?.() || JSON.stringify(responseData);

    expect(responseString).to.include('DearReader API');
    expect(responseString).to.include('Local Web Content Extractor');
  });
});
