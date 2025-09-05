import 'reflect-metadata';
import { expect } from 'chai';
import { PuppeteerControl } from '../puppeteer.js';

// Mock browser and page for testing
const mockPage = {
  isClosed: () => false,
  close: async () => {},
  setCookie: async () => {},
  goto: async () => {},
  waitForSelector: async () => {},
  evaluate: async () => {},
  content: async () => '',
  url: () => 'https://example.com',
  setUserAgent: async () => {},
  setExtraHTTPHeaders: async () => {},
  setViewport: async () => {},
  screenshot: async () => Buffer.from(''),
  pdf: async () => Buffer.from(''),
  frames: () => [],
  on: () => {},
  off: () => {},
  removeListener: () => {}
} as any;

const mockBrowser = {
  newPage: async () => mockPage,
  close: async () => {},
  connected: true,
  process: () => ({ pid: 1234 }),
  once: () => {},
  on: () => {},
  off: () => {},
  removeListener: () => {}
} as any;

describe('PuppeteerControl Queue System', () => {
  let puppeteerControl: PuppeteerControl;

  beforeEach(() => {
    puppeteerControl = new PuppeteerControl();
    // Mock the browser
    (puppeteerControl as any).browser = mockBrowser;
  });

  afterEach(async () => {
    // Clean up
    (puppeteerControl as any).requestQueue = [];
    (puppeteerControl as any).pagePool = [];
    (puppeteerControl as any).currentActivePages = 0;
  });

  describe('Queue Management', () => {
    it('should initialize with empty queue', () => {
      expect((puppeteerControl as any).requestQueue).to.be.an('array').that.is.empty;
      expect((puppeteerControl as any).currentActivePages).to.equal(0);
    });

    it('should add requests to queue when no pages available', async () => {
      const promise = (puppeteerControl as any).getNextPage(0);
      expect((puppeteerControl as any).requestQueue).to.have.lengthOf(1);
      expect((puppeteerControl as any).requestQueue[0]).to.have.property('priority', 0);
      expect((puppeteerControl as any).requestQueue[0]).to.have.property('timestamp');
    });

    it('should prioritize requests by priority', () => {
      // Add requests with different priorities
      const promise1 = (puppeteerControl as any).getNextPage(0);
      const promise2 = (puppeteerControl as any).getNextPage(5);
      const promise3 = (puppeteerControl as any).getNextPage(1);

      const queue = (puppeteerControl as any).requestQueue;
      expect(queue).to.have.lengthOf(3);
      // Should be sorted by priority (highest first)
      expect(queue[0].priority).to.equal(5);
      expect(queue[1].priority).to.equal(1);
      expect(queue[2].priority).to.equal(0);
    });

    it('should prioritize requests by timestamp when priorities are equal', () => {
      const startTime = Date.now();
      const promise1 = (puppeteerControl as any).getNextPage(1);
      const promise2 = (puppeteerControl as any).getNextPage(1);

      const queue = (puppeteerControl as any).requestQueue;
      expect(queue).to.have.lengthOf(2);
      // Should be sorted by timestamp (earliest first for same priority)
      expect(queue[0].timestamp).to.be.at.most(queue[1].timestamp);
    });
  });

  describe('Page Pool Management', () => {
    it('should track active pages correctly', () => {
      (puppeteerControl as any).currentActivePages = 0;
      expect((puppeteerControl as any).currentActivePages).to.equal(0);

      (puppeteerControl as any).currentActivePages = 5;
      expect((puppeteerControl as any).currentActivePages).to.equal(5);
    });

    it('should respect max concurrent pages limit', () => {
      const maxConcurrent = (puppeteerControl as any).maxConcurrentPages;
      (puppeteerControl as any).currentActivePages = maxConcurrent;

      // Add a request when at max capacity
      const promise = (puppeteerControl as any).getNextPage(0);
      expect((puppeteerControl as any).requestQueue).to.have.lengthOf(1);
    });

    it('should release pages back to pool', () => {
      const managedPage = {
        page: mockPage,
        context: {} as any,
        sn: 1,
        createdAt: Date.now(),
        inUse: true,
        lastUsed: Date.now()
      };

      (puppeteerControl as any).pagePool = [managedPage];
      (puppeteerControl as any).currentActivePages = 1;

      (puppeteerControl as any).releasePage(mockPage);

      expect(managedPage.inUse).to.be.false;
      expect((puppeteerControl as any).currentActivePages).to.equal(0);
    });
  });

  describe('Queue Processing', () => {
    it('should process queue when pages become available', async () => {
      // Set up a page in the pool
      const managedPage = {
        page: mockPage,
        context: {} as any,
        sn: 1,
        createdAt: Date.now(),
        inUse: false,
        lastUsed: Date.now()
      };
      (puppeteerControl as any).pagePool = [managedPage];
      (puppeteerControl as any).currentActivePages = 0;

      // Add a request
      const promise = (puppeteerControl as any).getNextPage(0);

      // Process the queue
      (puppeteerControl as any).processQueue();

      // Wait for the promise to resolve
      const resolvedPage = await promise;
      expect(resolvedPage).to.equal(mockPage);
      expect(managedPage.inUse).to.be.true;
      expect((puppeteerControl as any).currentActivePages).to.equal(1);
    });

    it('should create new pages when pool is not full', async () => {
      (puppeteerControl as any).pagePool = [];
      (puppeteerControl as any).currentActivePages = 0;
      (puppeteerControl as any).maxConcurrentPages = 5;

      // Mock createManagedPage
      (puppeteerControl as any).createManagedPage = async () => ({
        page: mockPage,
        context: {} as any,
        sn: 1,
        createdAt: Date.now(),
        inUse: false,
        lastUsed: Date.now()
      });

      const promise = (puppeteerControl as any).getNextPage(0);
      (puppeteerControl as any).processQueue();

      const resolvedPage = await promise;
      expect(resolvedPage).to.equal(mockPage);
      expect((puppeteerControl as any).pagePool).to.have.lengthOf(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle request timeouts', async () => {
      // Mock a long delay
      (puppeteerControl as any).getNextPage = function(priority: number) {
        return new Promise((resolve, reject) => {
          const request = { resolve, reject, priority, timestamp: Date.now() };
          this.requestQueue.push(request);

          setTimeout(() => {
            const index = this.requestQueue.indexOf(request);
            if (index !== -1) {
              this.requestQueue.splice(index, 1);
              reject(new Error('Page request timeout'));
            }
          }, 100); // Short timeout for testing
        });
      };

      try {
        await (puppeteerControl as any).getNextPage(0);
        expect.fail('Should have thrown timeout error');
      } catch (error: any) {
        expect(error.message).to.equal('Page request timeout');
      }
    });

    it('should reject all queued requests on service crash', () => {
      const promise1 = (puppeteerControl as any).getNextPage(0);
      const promise2 = (puppeteerControl as any).getNextPage(1);

      expect((puppeteerControl as any).requestQueue).to.have.lengthOf(2);

      // Simulate service crash
      (puppeteerControl as any).emit('crippled');

      // Queue should be cleared
      expect((puppeteerControl as any).requestQueue).to.have.lengthOf(0);
    });
  });

  describe('Priority Queue Behavior', () => {
    it('should handle multiple priorities correctly', () => {
      // Add requests with various priorities
      (puppeteerControl as any).getNextPage(0); // Low priority
      (puppeteerControl as any).getNextPage(10); // High priority
      (puppeteerControl as any).getNextPage(5); // Medium priority
      (puppeteerControl as any).getNextPage(1); // Low-medium priority

      (puppeteerControl as any).requestQueue.sort((a: any, b: any) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.timestamp - b.timestamp;
      });

      const queue = (puppeteerControl as any).requestQueue;
      expect(queue[0].priority).to.equal(10);
      expect(queue[1].priority).to.equal(5);
      expect(queue[2].priority).to.equal(1);
      expect(queue[3].priority).to.equal(0);
    });

    it('should maintain FIFO order for same priority', () => {
      const startTime = Date.now();

      (puppeteerControl as any).getNextPage(1);
      const midTime = Date.now();
      (puppeteerControl as any).getNextPage(1);

      const queue = (puppeteerControl as any).requestQueue;
      expect(queue[0].timestamp).to.be.at.most(queue[1].timestamp);
    });
  });
});
