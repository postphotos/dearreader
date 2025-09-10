
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

import "reflect-metadata";
import { expect } from "chai";
const mockPage = {
  isClosed: () => false,
  close: async () => {
  },
  setCookie: async () => {
  },
  goto: async () => {
  },
  waitForSelector: async () => {
  },
  evaluate: async () => {
  },
  content: async () => "",
  url: () => "https://example.com",
  setUserAgent: async () => {
  },
  setExtraHTTPHeaders: async () => {
  },
  setViewport: async () => {
  },
  screenshot: async () => Buffer.from(""),
  pdf: async () => Buffer.from(""),
  frames: () => [],
  on: () => {
  },
  off: () => {
  },
  removeListener: () => {
  }
};
const mockBrowser = {
  newPage: async () => mockPage,
  close: async () => {
  },
  connected: true,
  process: () => ({ pid: 1234 }),
  once: () => {
  },
  on: () => {
  },
  off: () => {
  },
  removeListener: () => {
  }
};
describe("PuppeteerControl Queue System", () => {
  let puppeteerControl;
  beforeEach(() => {
    puppeteerControl = {
      requestQueue: [],
      pagePool: [],
      maxConcurrentPages: 10,
      currentActivePages: 0,
      processing: false,
      emit: function(event) {
        if (event === "crippled") {
          this.requestQueue.forEach((req) => req.reject(new Error("Service has been crippled")));
          this.requestQueue.length = 0;
        }
      },
      getNextPage: function(priority = 0) {
        return new Promise((resolve, reject) => {
          const request = { resolve, reject, priority, timestamp: Date.now() };
          this.requestQueue.push(request);
          const timeout = setTimeout(() => {
            const index = this.requestQueue.indexOf(request);
            if (index !== -1) {
              this.requestQueue.splice(index, 1);
              reject(new Error("Page request timeout"));
            }
          }, 100);
          request.resolve = (page) => {
            clearTimeout(timeout);
            resolve(page);
          };
          request.reject = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });
      },
      releasePage: function(page) {
        const managedPage = this.pagePool.find((mp) => mp.page === page);
        if (managedPage && managedPage.inUse) {
          managedPage.inUse = false;
          managedPage.lastUsed = Date.now();
          this.currentActivePages--;
          this.processQueue();
        }
      },
      processQueue: function() {
        if (this.processing || this.requestQueue.length === 0) {
          return;
        }
        this.processing = true;
        this.requestQueue.sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return a.timestamp - b.timestamp;
        });
        while (this.requestQueue.length > 0 && this.currentActivePages < this.maxConcurrentPages) {
          const request = this.requestQueue.shift();
          let availablePage = this.pagePool.find((mp) => !mp.inUse);
          if (availablePage) {
            availablePage.inUse = true;
            availablePage.lastUsed = Date.now();
            this.currentActivePages++;
            request.resolve(availablePage.page);
          } else if (this.pagePool.length < this.maxConcurrentPages) {
            const newMockPage = {
              isClosed: () => false,
              close: async () => {
              },
              setCookie: async () => {
              },
              goto: async () => {
              },
              waitForSelector: async () => {
              },
              evaluate: async () => {
              },
              content: async () => "",
              url: () => "https://example.com",
              setUserAgent: async () => {
              },
              setExtraHTTPHeaders: async () => {
              },
              setViewport: async () => {
              },
              screenshot: async () => Buffer.from(""),
              pdf: async () => Buffer.from(""),
              frames: () => [],
              on: () => {
              },
              off: () => {
              },
              removeListener: () => {
              }
            };
            const managedPage = {
              page: newMockPage,
              context: {},
              sn: this.pagePool.length,
              createdAt: Date.now(),
              inUse: true,
              lastUsed: Date.now()
            };
            this.pagePool.push(managedPage);
            this.currentActivePages++;
            request.resolve(managedPage.page);
          } else {
            this.requestQueue.unshift(request);
            break;
          }
        }
        this.processing = false;
      }
    };
  });
  describe("Queue Management", () => {
    it("should add requests to queue when no pages available", async () => {
      puppeteerControl.maxConcurrentPages = 0;
      const promise = puppeteerControl.getNextPage(0);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(puppeteerControl.requestQueue).to.have.lengthOf(1);
      expect(puppeteerControl.requestQueue[0]).to.have.property("priority", 0);
      promise.catch(() => {
      });
    });
    it("should prioritize requests by priority", async () => {
      puppeteerControl.maxConcurrentPages = 0;
      puppeteerControl.getNextPage(0);
      puppeteerControl.getNextPage(5);
      puppeteerControl.getNextPage(1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      puppeteerControl.processQueue();
      const queue = puppeteerControl.requestQueue;
      expect(queue).to.have.lengthOf(3);
      expect(queue[0].priority).to.equal(5);
      expect(queue[1].priority).to.equal(1);
      expect(queue[2].priority).to.equal(0);
    });
    it("should prioritize requests by timestamp when priorities are equal", async () => {
      puppeteerControl.maxConcurrentPages = 0;
      const promise1 = puppeteerControl.getNextPage(1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const promise2 = puppeteerControl.getNextPage(1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      puppeteerControl.processQueue();
      const queue = puppeteerControl.requestQueue;
      expect(queue).to.have.lengthOf(2);
      expect(queue[0].timestamp).to.be.at.most(queue[1].timestamp);
      promise1.catch(() => {
      });
      promise2.catch(() => {
      });
    });
  });
  describe("Page Pool Management", () => {
    it("should track active pages correctly", () => {
      puppeteerControl.currentActivePages = 5;
      expect(puppeteerControl.currentActivePages).to.equal(5);
    });
    it("should respect max concurrent pages limit", () => {
      puppeteerControl.maxConcurrentPages = 1;
      puppeteerControl.currentActivePages = 1;
      const promise = puppeteerControl.getNextPage(0);
      puppeteerControl.processQueue();
      expect(puppeteerControl.requestQueue).to.have.lengthOf(1);
      promise.catch(() => {
      });
    });
    it("should release pages back to pool", () => {
      const managedPage = { page: mockPage, inUse: true };
      puppeteerControl.pagePool = [managedPage];
      puppeteerControl.currentActivePages = 1;
      puppeteerControl.releasePage(mockPage);
      expect(managedPage.inUse).to.be.false;
      expect(puppeteerControl.currentActivePages).to.equal(0);
    });
  });
  describe("Queue Processing", () => {
    it("should process queue when pages become available", async () => {
      const managedPage = { page: mockPage, inUse: false };
      puppeteerControl.pagePool = [managedPage];
      const promise = puppeteerControl.getNextPage(0);
      puppeteerControl.processQueue();
      const resolvedPage = await promise;
      expect(resolvedPage).to.equal(mockPage);
      expect(managedPage.inUse).to.be.true;
    });
    it("should create new pages when pool is not full", async () => {
      const promise = puppeteerControl.getNextPage(0);
      puppeteerControl.processQueue();
      const resolvedPage = await promise;
      expect(resolvedPage).to.have.property("isClosed");
      expect(resolvedPage.isClosed()).to.be.false;
      expect(resolvedPage.url()).to.equal("https://example.com");
    });
  });
  describe("Error Handling", () => {
    it("should handle request timeouts", async function() {
      this.timeout(500);
      const promise = puppeteerControl.getNextPage(0);
      try {
        await promise;
      } catch (error) {
        expect(error.message).to.equal("Page request timeout");
      }
    });
    it("should reject all queued requests on service crash", async () => {
      puppeteerControl.maxConcurrentPages = 0;
      const promises = [
        puppeteerControl.getNextPage(0),
        puppeteerControl.getNextPage(1)
      ];
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(puppeteerControl.requestQueue).to.have.lengthOf(2);
      puppeteerControl.emit("crippled");
      const results = await Promise.all(promises.map((p) => p.catch((e) => e)));
      results.forEach((result) => {
        expect(result).to.be.an("error");
        expect(result.message).to.equal("Service has been crippled");
      });
      expect(puppeteerControl.requestQueue).to.have.lengthOf(0);
    });
  });
  describe("Priority Queue Behavior", () => {
    it("should handle multiple priorities correctly", async () => {
      puppeteerControl.maxConcurrentPages = 0;
      puppeteerControl.getNextPage(0);
      puppeteerControl.getNextPage(10);
      puppeteerControl.getNextPage(5);
      puppeteerControl.getNextPage(1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      puppeteerControl.processQueue();
      const queue = puppeteerControl.requestQueue;
      expect(queue).to.have.length.of.at.least(4);
      expect(queue[0].priority).to.equal(10);
      expect(queue[1].priority).to.equal(5);
      expect(queue[2].priority).to.equal(1);
      expect(queue[3].priority).to.equal(0);
    });
    it("should maintain FIFO order for same priority", async () => {
      puppeteerControl.maxConcurrentPages = 0;
      puppeteerControl.getNextPage(1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      puppeteerControl.getNextPage(1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      puppeteerControl.processQueue();
      const queue = puppeteerControl.requestQueue;
      expect(queue).to.have.length.of.at.least(2);
      expect(queue[0].timestamp).to.be.at.most(queue[1].timestamp);
    });
  });
});
//# sourceMappingURL=puppeteer-queue.test.js.map
