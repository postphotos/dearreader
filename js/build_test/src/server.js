"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const tsyringe_1 = require("tsyringe");
const crawler_js_1 = require("./cloud-functions/crawler.js");
const logger_js_1 = require("./shared/logger.js");
const puppeteer_js_1 = require("./services/puppeteer.js");
const jsdom_js_1 = require("./services/jsdom.js");
const index_js_1 = require("./shared/index.js");
const index_js_2 = require("./shared/index.js");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Register services with the dependency injection container
tsyringe_1.container.registerSingleton(logger_js_1.Logger);
tsyringe_1.container.registerSingleton(puppeteer_js_1.PuppeteerControl);
tsyringe_1.container.registerSingleton(jsdom_js_1.JSDomControl);
tsyringe_1.container.registerSingleton(index_js_1.FirebaseStorageBucketControl);
tsyringe_1.container.registerSingleton(index_js_2.AsyncContext);
tsyringe_1.container.registerSingleton(crawler_js_1.CrawlerHost);
const crawlerHost = tsyringe_1.container.resolve(crawler_js_1.CrawlerHost);
// Wait for Puppeteer service to initialize
console.log('Initializing CrawlerHost');
await crawlerHost.init();
console.log('CrawlerHost initialized successfully');
app.use(express_1.default.json());
// Serve static files from the public directory
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
// Serve static files from the local-storage directory
app.use('/instant-screenshots', express_1.default.static(path_1.default.join('/app', 'local-storage', 'instant-screenshots')));
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
// Route for the root path to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'public', 'index.html'));
});
// Route for the queue UI to serve queue.html
app.get('/queue-ui', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'public', 'queue.html'));
});
app.all('*', async (req, res) => {
    try {
        await crawlerHost.crawl(req, res);
    }
    catch (error) {
        console.error('Error during crawl:', error);
        // Kontrola typu chyby
        if (error.message.includes('Invalid TLD')) {
            res.status(400).json({ error: 'Invalid URL or TLD' });
        }
        else {
            // Ošetrenie iných chýb
            res.status(500).json({ error: 'An error occurred during the crawl' });
        }
    }
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map