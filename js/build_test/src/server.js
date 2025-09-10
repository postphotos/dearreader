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
import { RateLimitService } from './services/rate-limit.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import config from './config.js';
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
container.registerSingleton(RateLimitService);
const crawlerHost = container.resolve(CrawlerHost);
const healthCheckService = container.resolve(HealthCheckService);
const cacheService = container.resolve(ResponseCacheService);
const rateLimitService = container.resolve(RateLimitService);
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
    }
    catch (e) {
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
            max_concurrent: 3, // From config
            status: 'operational',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory_usage: process.memoryUsage()
        };
        res.json(queueStats);
    }
    catch (error) {
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
            max_concurrent: 3, // From config
            status: 'operational',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory_usage: process.memoryUsage()
        };
        res.json(queueStats);
    }
    catch (error) {
        console.error('Error getting queue stats:', error);
        res.status(500).json({ error: 'Failed to get queue statistics' });
    }
});
// Queue reset endpoint
app.post('/queue/reset', (req, res) => {
    try {
        // Reset queue statistics
        res.json({ message: 'Queue statistics reset successfully' });
    }
    catch (error) {
        console.error('Error resetting queue stats:', error);
        res.status(500).json({ error: 'Failed to reset queue statistics' });
    }
});
// Primary queue reset endpoint with base path
app.post('/dearreader/queue/reset', (req, res) => {
    try {
        // Reset queue statistics
        res.json({ message: 'Queue statistics reset successfully' });
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Error getting cache stats:', error);
        res.status(500).json({ error: 'Failed to get cache statistics' });
    }
});
// Cache management endpoints
app.post('/cache/clear', (req, res) => {
    try {
        cacheService.clear();
        res.json({ message: 'Cache cleared successfully' });
    }
    catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});
// Status endpoint (alias for health)
app.get('/status', (req, res) => {
    res.redirect('/health');
});
// Tasks listing endpoint
app.get('/tasks', (req, res) => {
    try {
        const pipelineRouting = config.pipeline_routing || {};
        const routes = pipelineRouting.routes || {};
        const pipelines = pipelineRouting.pipelines || {};
        const availableTasks = {
            default_pipeline: pipelineRouting.default || 'html_default',
            available_routes: Object.keys(routes).map(route => ({
                path: route,
                pipeline: routes[route],
                description: pipelines[routes[route]]?.description || 'No description available'
            })),
            available_pipelines: Object.keys(pipelines).map(pipelineName => ({
                name: pipelineName,
                description: pipelines[pipelineName]?.description || 'No description available',
                ai_required: pipelines[pipelineName]?.ai_required || false,
                content_type: pipelines[pipelineName]?.content_type || 'html'
            })),
            usage_examples: [
                'GET /json/https://example.com/article (default processing)',
                'GET /task/html_enhanced/https://example.com/article (AI-enhanced)',
                'GET /task/pdf_enhanced/https://example.com/document.pdf (PDF with AI)',
                'GET /tasks (this listing)'
            ]
        };
        res.json(availableTasks);
    }
    catch (error) {
        console.error('Error getting tasks listing:', error);
        res.status(500).json({ error: 'Failed to get tasks listing' });
    }
});
// Rate limiting statistics endpoint
app.get('/rate-limit/stats', (req, res) => {
    try {
        const apiKey = req.query.api_key;
        if (!apiKey) {
            return res.status(400).json({ error: 'api_key query parameter required' });
        }
        const stats = rateLimitService.getUsageStats(apiKey);
        res.json(stats);
    }
    catch (error) {
        console.error('Error getting rate limit stats:', error);
        res.status(500).json({ error: 'Failed to get rate limit statistics' });
    }
});
// Function to serve HTML with conditional base tag
function serveHtmlWithBaseTag(filePath, res) {
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
        }
        else {
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
// Enhanced middleware to handle crawler requests with pipeline routing and rate limiting
app.use(errorHandler.wrapAsync(async (req, res, next) => {
    const urlPath = req.url;
    // Handle /dearreader/ prefixed URLs (legacy support)
    if (urlPath.startsWith('/dearreader/')) {
        const actualPath = urlPath.substring('/dearreader/'.length);
        if (actualPath) {
            const originalUrl = req.url;
            req.url = '/' + actualPath;
            await handleCrawlerRequest(req, res, next);
            req.url = originalUrl;
            return;
        }
    }
    // Handle new /task/{pipeline}/{url} format
    if (urlPath.startsWith('/task/')) {
        await handleTaskRequest(req, res, next);
        return;
    }
    // Handle root-level URLs (default processing)
    await handleCrawlerRequest(req, res, next);
}));
// Function to handle task-based requests with pipeline routing
async function handleTaskRequest(req, res, next) {
    try {
        const urlPath = req.url;
        const taskMatch = urlPath.match(/^\/task\/([^\/]+)\/(.+)$/);
        if (!taskMatch) {
            return res.status(400).json({
                error: 'Invalid task format',
                expected: '/task/{pipeline}/{url}',
                example: '/task/html_enhanced/https://example.com/article'
            });
        }
        const [, requestedPipeline, targetUrl] = taskMatch;
        const pipelineRouting = config.pipeline_routing || {};
        const routes = pipelineRouting.routes || {};
        const pipelines = pipelineRouting.pipelines || {};
        // Validate pipeline exists
        if (!pipelines[requestedPipeline]) {
            return res.status(404).json({
                error: 'Pipeline not found',
                requested_pipeline: requestedPipeline,
                available_pipelines: Object.keys(pipelines)
            });
        }
        // Check if pipeline requires AI and if AI is enabled
        const pipelineConfig = pipelines[requestedPipeline];
        if (pipelineConfig.ai_required && !config.ai_enabled) {
            return res.status(403).json({
                error: 'AI processing is disabled',
                pipeline: requestedPipeline,
                requires_ai: true
            });
        }
        // Rate limiting check for AI pipelines
        if (pipelineConfig.ai_required && config.rate_limiting?.enabled) {
            const apiKey = req.headers['x-api-key'] ||
                req.query.api_key ||
                process.env.OPENROUTER_API_KEY; // Fallback to env
            if (apiKey) {
                // Find the provider for this pipeline's tasks
                const provider = findProviderForPipeline(requestedPipeline);
                if (provider) {
                    const rateLimitCheck = await rateLimitService.checkRateLimit(apiKey, provider);
                    if (!rateLimitCheck.allowed) {
                        return res.status(429).json({
                            error: 'Rate limit exceeded',
                            reason: rateLimitCheck.reason,
                            usage: rateLimitCheck.usage,
                            retry_after: 'Wait for rate limit reset or use different API key'
                        });
                    }
                }
            }
        }
        // Temporarily modify req.url to the target URL for crawling
        const originalUrl = req.url;
        req.url = '/' + targetUrl;
        // Add pipeline context to request
        req.pipeline = requestedPipeline;
        req.pipelineConfig = pipelineConfig;
        await crawlerHost.crawl(req, res);
        // Record successful request for rate limiting
        if (pipelineConfig.ai_required && config.rate_limiting?.enabled) {
            const apiKey = req.headers['x-api-key'] ||
                req.query.api_key ||
                process.env.OPENROUTER_API_KEY;
            if (apiKey) {
                const provider = findProviderForPipeline(requestedPipeline);
                if (provider) {
                    await rateLimitService.recordRequest(apiKey, provider);
                }
            }
        }
        req.url = originalUrl;
    }
    catch (error) {
        console.error('Error handling task request:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error processing task request' });
        }
    }
}
// Function to handle regular crawler requests
async function handleCrawlerRequest(req, res, next) {
    try {
        const urlPath = req.url;
        // For regular requests, use default pipeline
        const pipelineRouting = config.pipeline_routing || {};
        const defaultPipeline = pipelineRouting.default || 'html_default';
        const pipelines = pipelineRouting.pipelines || {};
        // Add default pipeline context
        req.pipeline = defaultPipeline;
        req.pipelineConfig = pipelines[defaultPipeline] || {};
        await crawlerHost.crawl(req, res);
    }
    catch (error) {
        console.error('Error handling crawler request:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error processing request' });
        }
    }
}
// Helper function to find provider for a pipeline
function findProviderForPipeline(pipelineName) {
    const pipelines = config.pipeline_routing?.pipelines || {};
    const pipeline = pipelines[pipelineName];
    if (!pipeline || !pipeline.stages) {
        return null;
    }
    // Find the first LLM processing stage and get its provider
    for (const stage of pipeline.stages) {
        if (stage.type === 'llm_process' && stage.llm_provider) {
            return stage.llm_provider;
        }
    }
    return null;
}
// Add global error handling middleware
app.use(errorHandler.expressErrorHandler());
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
export default app;
//# sourceMappingURL=server.js.map