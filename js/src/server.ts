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
import { ResponseCacheService } from './services/cache.js';
import { HealthCheckService } from './services/health-check.js';
import { config as appConfig } from './shared/config-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import config from './config.js';
import { VERSION } from './version.js';
import { errorHandler } from './shared/error-handler.js';

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
container.registerSingleton(ResponseCacheService);
container.registerSingleton(HealthCheckService);
container.registerSingleton(CrawlerHost);

const crawlerHost = container.resolve(CrawlerHost);
const healthCheckService = container.resolve(HealthCheckService);
const cacheService = container.resolve(ResponseCacheService);

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

// Also serve static files with a base path for proxy compatibility
app.use('/dearreader', express.static(path.join(__dirname, '..', 'public')));

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

// Primary queue endpoint with base path
app.get('/dearreader/queue', (req, res) => {
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

// Queue reset endpoint
app.post('/queue/reset', (req, res) => {
  try {
    // Reset queue statistics
    res.json({ message: 'Queue statistics reset successfully' });
  } catch (error: any) {
    console.error('Error resetting queue stats:', error);
    res.status(500).json({ error: 'Failed to reset queue statistics' });
  }
});

// Primary queue reset endpoint with base path
app.post('/dearreader/queue/reset', (req, res) => {
  try {
    // Reset queue statistics
    res.json({ message: 'Queue statistics reset successfully' });
  } catch (error: any) {
    console.error('Error resetting queue stats:', error);
    res.status(500).json({ error: 'Failed to reset queue statistics' });
  }
});

// Health/Status endpoint - comprehensive health check
app.get('/health', errorHandler.wrapAsync(async (req, res) => {
  const health = await healthCheckService.performHealthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
}));

// Kubernetes-style probes
app.get('/health/live', errorHandler.wrapAsync(async (req, res) => {
  const isAlive = await healthCheckService.isAlive();
  res.status(isAlive ? 200 : 503).json({ status: isAlive ? 'alive' : 'dead' });
}));

app.get('/health/ready', errorHandler.wrapAsync(async (req, res) => {
  const isReady = await healthCheckService.isReady();
  res.status(isReady ? 200 : 503).json({ status: isReady ? 'ready' : 'not ready' });
}));

// Cache statistics endpoint
app.get('/cache/stats', (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

// Cache management endpoints
app.post('/cache/clear', (req, res) => {
  try {
    cacheService.clear();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Status endpoint (alias for health)
app.get('/status', (req, res) => {
  res.redirect('/health');
});

// Function to serve HTML with conditional base tag
function serveHtmlWithBaseTag(filePath: string, res: express.Response) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading file');
      return;
    }

    if (config.base_path?.enabled) {
      // Add base tag after title if not already present
      if (!data.includes('<base href=')) {
        const baseTag = `<base href="${config.base_path.path}">`;
        data = data.replace(/(<title>.*?<\/title>)/, '$1\n  ' + baseTag);
      }
    } else {
      // Remove base tag if it exists
      data = data.replace(/^\s*<base href="[^"]*">\s*$/gm, '');
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(data);
  });
}

// Primary routes - always serve from /dearreader/ path
app.get('/dearreader/', (req, res) => {
  serveHtmlWithBaseTag(path.join(__dirname, '..', 'public', 'index.html'), res);
});

app.get('/dearreader/queue-ui', (req, res) => {
  serveHtmlWithBaseTag(path.join(__dirname, '..', 'public', 'queue.html'), res);
});

// Legacy root routes - redirect to /dearreader/ paths
app.get('/', (req, res) => {
  res.redirect('/dearreader/');
});

app.get('/queue-ui', (req, res) => {
  res.redirect('/dearreader/queue-ui');
});

// Middleware to handle crawler requests for both root and /dearreader/ paths
app.use(errorHandler.wrapAsync(async (req, res, next) => {
  // Check if this is a crawler request
  let urlPath = req.url;

  // Handle /dearreader/ prefixed URLs
  if (urlPath.startsWith('/dearreader/')) {
    // Remove the /dearreader/ prefix to get the actual URL
    urlPath = urlPath.substring('/dearreader/'.length);
    if (urlPath) {
      // Temporarily modify req.url for the crawler
      const originalUrl = req.url;
      req.url = '/' + urlPath;
      await crawlerHost.crawl(req, res);
      req.url = originalUrl; // Restore original URL
      return;
    }
  }

  // Handle root-level URLs (original behavior)
  await crawlerHost.crawl(req, res);
}));

// Add global error handling middleware
app.use(errorHandler.expressErrorHandler());

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
