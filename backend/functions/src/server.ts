import 'reflect-metadata';
import express from 'express';
import { container } from 'tsyringe';
import { CrawlerHost } from './cloud-functions/crawler.js';
import { Logger } from './shared/logger.js';
import { PuppeteerControl } from './services/puppeteer.js';
import { JSDomControl } from './services/jsdom.js';
import { FirebaseStorageBucketControl } from './shared/index.js';
import { AsyncContext } from './shared/index.js';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// Register services with the dependency injection container
container.registerSingleton(Logger);
container.registerSingleton(PuppeteerControl);
container.registerSingleton(JSDomControl);
container.registerSingleton(FirebaseStorageBucketControl);
container.registerSingleton(AsyncContext);
container.registerSingleton(CrawlerHost);

const crawlerHost = container.resolve(CrawlerHost);

// Wait for Puppeteer service to initialize
console.log('Initializing CrawlerHost');
await crawlerHost.init();
console.log('CrawlerHost initialized successfully');

app.use(express.json());

// Serve static files from the local-storage directory
app.use('/instant-screenshots', express.static(path.join('/app', 'local-storage', 'instant-screenshots')));

app.all('*', async (req, res) => {
  try {
    await crawlerHost.crawl(req, res);
  } catch (error: any) {
    console.error('Error during crawl:', error);

    // Kontrola typu chyby
    if (error.message.includes('Invalid TLD')) {
      res.status(400).json({ error: 'Invalid URL or TLD' });
    } else {
      // Ošetrenie iných chýb
      res.status(500).json({ error: 'An error occurred during the crawl' });
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
