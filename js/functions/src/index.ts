import 'reflect-metadata';
import { initializeApp } from 'firebase-admin/app';
import { CrawlerHost } from './cloud-functions/crawler.js';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { Logger } from './shared/logger.js';
import { container } from 'tsyringe';
import { PuppeteerControl } from './services/puppeteer.js';
import { JSDomControl } from './services/jsdom.js';
import { FirebaseStorageBucketControl } from './shared/index.js';
import { AsyncContext } from './shared/index.js';

initializeApp();

container.registerSingleton(Logger);
container.registerSingleton(PuppeteerControl);
container.registerSingleton(JSDomControl);
container.registerSingleton(FirebaseStorageBucketControl);
container.registerSingleton(AsyncContext);
container.registerSingleton(CrawlerHost);

const crawlerHost = container.resolve(CrawlerHost);
export const crawler = onRequest(
  {
    memory: '4GiB',
    timeoutSeconds: 540,
  },
  async (req, res) => {
    await crawlerHost.crawl(req, res);
  }
);

export const helloWorld = onRequest((req, res) => {
  res.send('Hello World!');
});


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
