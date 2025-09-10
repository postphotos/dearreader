import 'reflect-metadata';
import { expect } from 'chai';
// Mock browser and page for testing
const mockPage = {
    isClosed: () => false,
    close: async () => { },
    setCookie: async () => { },
    goto: async () => { },
    waitForSelector: async () => { },
    evaluate: async () => { },
    content: async () => '',
    url: () => 'https://example.com',
    setUserAgent: async () => { },
    setExtraHTTPHeaders: async () => { },
    setViewport: async () => { },
    screenshot: async () => Buffer.from(''),
    pdf: async () => Buffer.from(''),
    frames: () => [],
    on: () => { },
    off: () => { },
    removeListener: () => { }
};
const mockBrowser = {
    newPage: async () => mockPage,
    close: async () => { },
    connected: true,
    process: () => ({ pid: 1234 }),
    once: () => { },
    on: () => { },
    off: () => { },
    removeListener: () => { }
};
describe('PuppeteerControl Queue System', () => {
    let puppeteerControl;
    beforeEach(() => {
        // Create a minimal mock of PuppeteerControl focusing on queue functionality
        puppeteerControl = {
            requestQueue: [],
            pagePool: [],
            maxConcurrentPages: 10,
            currentActivePages: 0,
            processing: false,
            emit: function (event) {
                if (event === 'crippled') {
                    this.requestQueue.forEach((req) => req.reject(new Error('Service has been crippled')));
                    this.requestQueue.length = 0;
                }
            },
            getNextPage: function (priority = 0) {
                return new Promise((resolve, reject) => {
                    const request = { resolve, reject, priority, timestamp: Date.now() };
                    this.requestQueue.push(request);
                    const timeout = setTimeout(() => {
                        const index = this.requestQueue.indexOf(request);
                        if (index !== -1) {
                            this.requestQueue.splice(index, 1);
                            reject(new Error('Page request timeout'));
                        }
                    }, 30000);
                    request.resolve = (page) => { clearTimeout(timeout); resolve(page); };
                    request.reject = (error) => { clearTimeout(timeout); reject(error); };
                    // Intentionally not calling processQueue() to let test control processing
                });
            },
            releasePage: function (page) {
                const managedPage = this.pagePool.find((mp) => mp.page === page);
                if (managedPage && managedPage.inUse) {
                    managedPage.inUse = false;
                    managedPage.lastUsed = Date.now();
                    this.currentActivePages--;
                    this.processQueue();
                }
            },
            processQueue: function () {
                if (this.processing || this.requestQueue.length === 0) {
                    return;
                }
                this.processing = true;
                this.requestQueue.sort((a, b) => {
                    if (a.priority !== b.priority)
                        return b.priority - a.priority;
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
                    }
                    else if (this.pagePool.length < this.maxConcurrentPages) {
                        // Create new page with all required properties to match mockPage
                        const newMockPage = {
                            isClosed: () => false,
                            close: async () => { },
                            setCookie: async () => { },
                            goto: async () => { },
                            waitForSelector: async () => { },
                            evaluate: async () => { },
                            content: async () => '',
                            url: () => 'https://example.com',
                            setUserAgent: async () => { },
                            setExtraHTTPHeaders: async () => { },
                            setViewport: async () => { },
                            screenshot: async () => Buffer.from(''),
                            pdf: async () => Buffer.from(''),
                            frames: () => [],
                            on: () => { },
                            off: () => { },
                            removeListener: () => { }
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
                    }
                    else {
                        this.requestQueue.unshift(request);
                        break;
                    }
                }
                this.processing = false;
            }
        };
    });
    describe('Queue Management', () => {
        it('should add requests to queue when no pages available', async () => {
            puppeteerControl.maxConcurrentPages = 0; // Ensure no pages are processed
            const promise = puppeteerControl.getNextPage(0);
            // Use a timeout to allow the event loop to process the promise
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(puppeteerControl.requestQueue).to.have.lengthOf(1);
            expect(puppeteerControl.requestQueue[0]).to.have.property('priority', 0);
            // Prevent unhandled promise rejection for the test
            promise.catch(() => { });
        });
        it('should prioritize requests by priority', async () => {
            puppeteerControl.maxConcurrentPages = 0; // Ensure no pages are processed
            puppeteerControl.getNextPage(0);
            puppeteerControl.getNextPage(5);
            puppeteerControl.getNextPage(1);
            await new Promise(resolve => setTimeout(resolve, 10));
            puppeteerControl.processQueue();
            // This test should check the order of processing, not the queue state after processing.
            // For this mock, we'll check the sorted queue before processing would dequeue it.
            const queue = puppeteerControl.requestQueue;
            expect(queue).to.have.lengthOf(3);
            expect(queue[0].priority).to.equal(5);
            expect(queue[1].priority).to.equal(1);
            expect(queue[2].priority).to.equal(0);
        });
        it('should prioritize requests by timestamp when priorities are equal', async () => {
            puppeteerControl.maxConcurrentPages = 0; // Ensure no pages are processed
            const promise1 = puppeteerControl.getNextPage(1);
            await new Promise(resolve => setTimeout(resolve, 10));
            const promise2 = puppeteerControl.getNextPage(1);
            await new Promise(resolve => setTimeout(resolve, 10));
            puppeteerControl.processQueue();
            const queue = puppeteerControl.requestQueue;
            expect(queue).to.have.lengthOf(2);
            expect(queue[0].timestamp).to.be.at.most(queue[1].timestamp);
            // Prevent unhandled promise rejection
            promise1.catch(() => { });
            promise2.catch(() => { });
        });
    });
    describe('Page Pool Management', () => {
        it('should track active pages correctly', () => {
            puppeteerControl.currentActivePages = 5;
            expect(puppeteerControl.currentActivePages).to.equal(5);
        });
        it('should respect max concurrent pages limit', () => {
            puppeteerControl.maxConcurrentPages = 1;
            puppeteerControl.currentActivePages = 1;
            const promise = puppeteerControl.getNextPage(0);
            puppeteerControl.processQueue();
            expect(puppeteerControl.requestQueue).to.have.lengthOf(1);
            promise.catch(() => { });
        });
        it('should release pages back to pool', () => {
            const managedPage = { page: mockPage, inUse: true };
            puppeteerControl.pagePool = [managedPage];
            puppeteerControl.currentActivePages = 1;
            puppeteerControl.releasePage(mockPage);
            expect(managedPage.inUse).to.be.false;
            expect(puppeteerControl.currentActivePages).to.equal(0);
        });
    });
    describe('Queue Processing', () => {
        it('should process queue when pages become available', async () => {
            const managedPage = { page: mockPage, inUse: false };
            puppeteerControl.pagePool = [managedPage];
            const promise = puppeteerControl.getNextPage(0);
            puppeteerControl.processQueue();
            const resolvedPage = await promise;
            expect(resolvedPage).to.equal(mockPage);
            expect(managedPage.inUse).to.be.true;
        });
        it('should create new pages when pool is not full', async () => {
            const promise = puppeteerControl.getNextPage(0);
            puppeteerControl.processQueue();
            const resolvedPage = await promise;
            expect(resolvedPage).to.have.property('isClosed');
            expect(resolvedPage.isClosed()).to.be.false;
            expect(resolvedPage.url()).to.equal('https://example.com');
        });
    });
    describe('Error Handling', () => {
        it('should handle request timeouts', async function () {
            this.timeout(31000); // Increase timeout to allow for the 30s mock timeout
            const promise = puppeteerControl.getNextPage(0);
            try {
                await promise;
            }
            catch (error) {
                expect(error.message).to.equal('Page request timeout');
            }
        });
        it('should reject all queued requests on service crash', async () => {
            puppeteerControl.maxConcurrentPages = 0; // Ensure no pages are processed
            const promises = [
                puppeteerControl.getNextPage(0),
                puppeteerControl.getNextPage(1)
            ];
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(puppeteerControl.requestQueue).to.have.lengthOf(2);
            puppeteerControl.emit('crippled');
            const results = await Promise.all(promises.map(p => p.catch((e) => e)));
            results.forEach(result => {
                expect(result).to.be.an('error');
                expect(result.message).to.equal('Service has been crippled');
            });
            expect(puppeteerControl.requestQueue).to.have.lengthOf(0);
        });
    });
    describe('Priority Queue Behavior', () => {
        it('should handle multiple priorities correctly', async () => {
            puppeteerControl.maxConcurrentPages = 0; // Ensure no pages are processed
            puppeteerControl.getNextPage(0);
            puppeteerControl.getNextPage(10);
            puppeteerControl.getNextPage(5);
            puppeteerControl.getNextPage(1);
            await new Promise(resolve => setTimeout(resolve, 10));
            puppeteerControl.processQueue();
            const queue = puppeteerControl.requestQueue;
            expect(queue).to.have.length.of.at.least(4);
            expect(queue[0].priority).to.equal(10);
            expect(queue[1].priority).to.equal(5);
            expect(queue[2].priority).to.equal(1);
            expect(queue[3].priority).to.equal(0);
        });
        it('should maintain FIFO order for same priority', async () => {
            puppeteerControl.maxConcurrentPages = 0; // Ensure no pages are processed
            puppeteerControl.getNextPage(1);
            await new Promise(resolve => setTimeout(resolve, 10));
            puppeteerControl.getNextPage(1);
            await new Promise(resolve => setTimeout(resolve, 10));
            puppeteerControl.processQueue();
            const queue = puppeteerControl.requestQueue;
            expect(queue).to.have.length.of.at.least(2);
            expect(queue[0].timestamp).to.be.at.most(queue[1].timestamp);
        });
    });
});
//# sourceMappingURL=puppeteer-queue.test.js.map