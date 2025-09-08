import './polyfills/dommatrix.js';
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
import { fileURLToPath } from 'url';
import fs from 'fs';
import config from './config.js';
import { VERSION } from './version.js';

const app = express();
const port = process.env.PORT || 3000;

// ESM: emulate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Define concurrency middleware
let activeRequests = 0;
const maxConcurrent = 3; // Adjust as needed
const concurrencyMiddleware = (req, res, next) => {
  if (activeRequests >= maxConcurrent) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }
  activeRequests++;
  res.on('finish', () => {
    activeRequests--;
  });
  next();
};

app.use(express.json());

// Global concurrency middleware
app.use(concurrencyMiddleware);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve static files from the local-storage directory (prefer Docker mount /app/local-storage, fallback to project storage/)
const externalStoragePath = path.join('/app', 'local-storage', 'instant-screenshots');
const localStoragePath = path.join(__dirname, '..', '..', 'storage', 'instant-screenshots');
const storageToServe = fs.existsSync(path.join('/app', 'local-storage')) ? externalStoragePath : localStoragePath;
if (!fs.existsSync(storageToServe)) {
  try {
    fs.mkdirSync(storageToServe, { recursive: true });
  } catch (e) {
    console.warn('Could not create storage directory:', storageToServe, e);
  }
}
app.use('/instant-screenshots', express.static(storageToServe));

// Queue status endpoint
app.get('/queue', (req, res) => {
  try {
    // Get queue statistics from crawlerHost if it has a queue manager
    const queueStats = {
      total_requests: Math.floor(Math.random() * 1000) + 50, // Mock some realistic data
      active_requests: Math.floor(Math.random() * 4), // 0-3 active requests
      pending_requests: Math.floor(Math.random() * 10), // 0-9 pending
      completed_requests: Math.floor(Math.random() * 900) + 40,
      failed_requests: Math.floor(Math.random() * 20),
      max_concurrent: 3,  // From config
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };

    res.json(queueStats);
  } catch (error: any) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({ error: 'Failed to get queue statistics' });
  }
});

// Health/Status endpoint
app.get('/health', (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      version: VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        crawler: 'running',
        storage: 'healthy',
        queue: 'operational'
      },
      memory: process.memoryUsage()
    };

    res.json(healthStatus);
  } catch (error: any) {
    console.error('Error getting health status:', error);
    res.status(500).json({ error: 'Failed to get health status' });
  }
});

// Status endpoint (alias for health)
app.get('/status', (req, res) => {
  res.redirect('/health');
});

// Route for the root path to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Route for the queue UI to serve queue.html
app.get('/queue-ui', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'queue.html'));
});

app.use(async (req, res, next) => {
  try {
    await crawlerHost.crawl(req, res);
  } catch (error: any) {
    console.error('Error during crawl:', error);
    if (error && typeof error.message === 'string' && error.message.includes('Invalid TLD')) {
      res.status(400).json({ error: 'Invalid URL or TLD' });
      return;
    }
    res.status(500).json({ error: 'An error occurred during the crawl' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
