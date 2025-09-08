"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const crawler_js_1 = require("./cloud-functions/crawler.js");
const logger_js_1 = require("./shared/logger.js");
const tsyringe_1 = require("tsyringe");
const puppeteer_js_1 = require("./services/puppeteer.js");
const jsdom_js_1 = require("./services/jsdom.js");
const index_js_1 = require("./shared/index.js");
const index_js_2 = require("./shared/index.js");
// Local Express server setup instead of Firebase Functions
const app = (0, express_1.default)();
app.use(express_1.default.json());
tsyringe_1.container.registerSingleton(logger_js_1.Logger);
tsyringe_1.container.registerSingleton(puppeteer_js_1.PuppeteerControl);
tsyringe_1.container.registerSingleton(jsdom_js_1.JSDomControl);
tsyringe_1.container.registerSingleton(index_js_1.FirebaseStorageBucketControl);
tsyringe_1.container.registerSingleton(index_js_2.AsyncContext);
tsyringe_1.container.registerSingleton(crawler_js_1.CrawlerHost);
const crawlerHost = tsyringe_1.container.resolve(crawler_js_1.CrawlerHost);
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
exports.default = app;
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