// Mock implementation for Puppeteer when Chromium is not available
// This allows tests to run even in environments without proper browser setup

// Mock types to match Puppeteer interfaces
interface MockCookieParam {
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

interface MockPageSnapshot {
  title: string;
  href: string;
  html: string;
  text: string;
  parsed?: any;
  screenshot?: Buffer;
  error?: string;
}

// Mock Page implementation
class MockPage {
  private cookies: MockCookieParam[] = [];
  private userAgent = 'MockBrowser/1.0';

  async setBypassCSP(enabled: boolean): Promise<void> {
    // Mock implementation
  }

  async setViewport(viewport: { width: number; height: number }): Promise<void> {
    // Mock implementation
  }

  async exposeFunction(name: string, fn: Function): Promise<void> {
    // Mock implementation
  }

  async evaluateOnNewDocument(script: string): Promise<void> {
    // Mock implementation
  }

  async setRequestInterception(enabled: boolean): Promise<void> {
    // Mock implementation
  }

  async goto(url: string, options?: any): Promise<any> {
    return { status: () => 200 };
  }

  async evaluate(script: string | Function): Promise<any> {
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

  async content(): Promise<string> {
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

  async screenshot(options?: any): Promise<Buffer> {
    return Buffer.from('mock-screenshot');
  }

  async close(): Promise<void> {
    // Mock implementation
  }

  async waitForSelector(selector: string, options?: any): Promise<any> {
    // Mock implementation - return a mock element
    return {};
  }

  async waitForTimeout(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.min(ms, 100))); // Fast mock
  }

  async setCookie(...cookies: MockCookieParam[]): Promise<void> {
    this.cookies.push(...cookies);
  }

  async setUserAgent(userAgent: string): Promise<void> {
    this.userAgent = userAgent;
  }

  async title(): Promise<string> {
    return 'Reading is Fundamental';
  }

  on(event: string, handler: Function): void {
    // Mock event listener
  }

  emit(event: string, ...args: any[]): void {
    // Mock event emitter
  }

  browserContext(): MockBrowserContext {
    return new MockBrowserContext();
  }

  mainFrame(): any {
    return {
      childFrames: () => []
    };
  }

  isClosed(): boolean {
    return false;
  }
}

// Mock BrowserContext implementation
class MockBrowserContext {
  async newPage(): Promise<MockPage> {
    return new MockPage();
  }

  async close(): Promise<void> {
    // Mock implementation
  }

  async pages(): Promise<MockPage[]> {
    return [new MockPage()];
  }
}

// Mock Browser implementation
class MockBrowser {
  private pages: MockPage[] = [];

  async newPage(): Promise<MockPage> {
    const page = new MockPage();
    this.pages.push(page);
    return page;
  }

  defaultBrowserContext(): MockBrowserContext {
    return new MockBrowserContext();
  }

  async close(): Promise<void> {
    // Mock implementation
  }

  process(): any {
    return { pid: 12345, kill: () => {} };
  }

  connected: boolean = true;

  on(event: string, handler: Function): void {
    // Mock event listener
  }

  once(event: string, handler: Function): void {
    // Mock event listener
  }

  emit(event: string, ...args: any[]): void {
    // Mock event emitter
  }
}

// Mock Puppeteer launch function
const mockPuppeteerLaunch = async (options?: any): Promise<MockBrowser> => {
  return new MockBrowser();
};

// Mock puppeteer-extra addExtra function
const createMockAddExtra = (puppeteer: any) => {
  return {
    ...puppeteer,
    launch: mockPuppeteerLaunch,
    use: () => {} // Mock plugin system
  };
};

// Export the mock implementations
export const mockPuppeteer = {
  launch: mockPuppeteerLaunch
};

export const mockAddExtra = createMockAddExtra;

export default mockPuppeteer;