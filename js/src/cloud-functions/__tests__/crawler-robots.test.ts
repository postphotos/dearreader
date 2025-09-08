import { expect } from 'chai';

// Import the crawler ESM module for tests
import { CrawlerHost } from '../crawler.js';

describe('CrawlerHost Robots Checker Edge Cases', () => {
  it('should proceed when robotsChecker is missing methods', async () => {
    const crawler = new CrawlerHost(
      // minimal mocks: puppeteerControl, jsdomControl, pdfExtractor, robotsChecker, storage, threadLocal
  ({ scrape: async function* (_: URL) { yield { title: 'X', href: 'http://example/', html: '<html></html>', text: 'X', parsed: { title: 'X', content: 'X', excerpt: 'X' }, imgs: [] }; }, _sn: 'mock', browser: null, logger: console, startTime: Date.now(), circuitBreakerHosts: new Set(), on: () => {}, emit: () => {} } as any),
  ( { inferSnapshot: (s:any) => s, narrowSnapshot: (s:any) => s, runTurndown: () => 'ok' } as any),
  ( { extract: async () => ({ content: 'pdf' }) } as any),
  // robotsChecker provided but without isAllowed/getCrawlDelay
  ( { check: async () => true } as any),
  ( {} as any),
  ( { _data: new Map(), get: () => undefined, set: () => {} } as any)
    );

    const req: any = { url: '/https://www.ala.org', method: 'GET', query: {}, headers: { accept: 'application/json' }, hostname: 'localhost' };
    const res: any = { _status: 200, _data: null, status(code:number){ this._status = code; return this; }, type(){ return this; }, send(data:any){ this._data = data; } };

    await crawler.crawl(req, res as any);

    expect(res._data).to.exist;
  });
});
