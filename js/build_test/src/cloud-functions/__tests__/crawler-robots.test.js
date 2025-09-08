import { expect } from 'chai';
// Import the crawler ESM module for tests
import { CrawlerHost } from '../crawler.js';
describe('CrawlerHost Robots Checker Edge Cases', () => {
    it('should proceed when robotsChecker is missing methods', async () => {
        const crawler = new CrawlerHost(
        // minimal mocks: puppeteerControl, jsdomControl, pdfExtractor, robotsChecker, storage, threadLocal
        { scrape: async function* (_) { yield { title: 'X', href: 'http://example/', html: '<html></html>', text: 'X', parsed: { title: 'X', content: 'X', excerpt: 'X' }, imgs: [] }; }, _sn: 'mock', browser: null, logger: console, startTime: Date.now(), circuitBreakerHosts: new Set(), on: () => { }, emit: () => { } }, { inferSnapshot: (s) => s, narrowSnapshot: (s) => s, runTurndown: () => 'ok' }, { extract: async () => ({ content: 'pdf' }) }, 
        // robotsChecker provided but without isAllowed/getCrawlDelay
        { check: async () => true }, {}, { _data: new Map(), get: () => undefined, set: () => { } });
        const req = { url: '/https://www.ala.org', method: 'GET', query: {}, headers: { accept: 'application/json' }, hostname: 'localhost' };
        const res = { _status: 200, _data: null, status(code) { this._status = code; return this; }, type() { return this; }, send(data) { this._data = data; } };
        await crawler.crawl(req, res);
        expect(res._data).to.exist;
    });
});
//# sourceMappingURL=crawler-robots.test.js.map