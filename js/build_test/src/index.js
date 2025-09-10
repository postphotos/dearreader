import 'reflect-metadata';
import express from 'express';
import { concurrencyMiddleware } from './middleware/concurrency.js';
import { CrawlerHost } from './cloud-functions/crawler.js';
import { Logger } from './shared/logger.js';
import { container } from 'tsyringe';
import { PuppeteerControl } from './services/puppeteer.js';
import { JSDomControl } from './services/jsdom.js';
import { FirebaseStorageBucketControl } from './shared/index.js';
import { AsyncContext } from './shared/index.js';
// Local Express server setup instead of Firebase Functions
const app = express();
app.use(express.json());
// apply global concurrency middleware early
app.use(concurrencyMiddleware);
container.registerSingleton(Logger);
container.registerSingleton(PuppeteerControl);
container.registerSingleton(JSDomControl);
container.registerSingleton(FirebaseStorageBucketControl);
container.registerSingleton(AsyncContext);
container.registerSingleton(CrawlerHost);
const crawlerHost = container.resolve(CrawlerHost);
// API endpoints for local crawler
app.post('/crawl', async (req, res) => {
    try {
        await crawlerHost.crawl(req, res);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: errorMessage });
    }
});
app.get('/', (req, res) => {
    res.json({ message: 'DearReader Local Crawler Server Running' });
});
// Export for use in server.js
export default app;
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Looks like Firebase runtime does not handle error properly.
    // Make sure to quit the process.
    process.nextTick(() => process.exit(1));
    console.error('Uncaught exception, process quit.');
    throw err;
});
//# sourceMappingURL=index.js.map