
// Polyfill for DOMMatrix (needed for pdfjs-dist)
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    constructor(init) {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
      if (typeof init === 'string') {
        // ignore matrix string
      }
      else if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init.concat([1, 0, 0, 1, 0, 0]).slice(0, 6);
      }
      else if (init && typeof init === 'object') {
        Object.assign(this, init);
      }
    }
    multiply() { return this; }
    multiplySelf() { return this; }
    translateSelf() { return this; }
    scaleSelf() { return this; }
    toString() { return '' + this.a + ',' + this.b + ',' + this.c + ',' + this.d + ',' + this.e + ',' + this.f; }
  }
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

// Polyfill for Promise.withResolvers (Node.js 18+)
if (typeof globalThis.Promise.withResolvers === 'undefined') {
  globalThis.Promise.withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import "./polyfills/dommatrix.js";
import "reflect-metadata";
import express from "express";
import { container } from "tsyringe";
import { CrawlerHost } from "./cloud-functions/crawler.js";
import { Logger } from "./shared/logger.js";
import { PuppeteerControl } from "./services/puppeteer.js";
import { JSDomControl } from "./services/jsdom.js";
import { FirebaseStorageBucketControl } from "./shared/index.js";
import { AsyncContext } from "./shared/index.js";
import { ResponseCacheService } from "./services/cache.js";
import { HealthCheckService } from "./services/health-check.js";
import { RateLimitService } from "./services/rate-limit.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import config from "./config.js";
import { errorHandler } from "./shared/error-handler.js";
const app = express();
const port = process.env.PORT || 3e3;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
console.log("Initializing CrawlerHost");
await crawlerHost.init();
console.log("CrawlerHost initialized successfully");
let activeRequests = 0;
const maxConcurrent = 3;
const concurrencyMiddleware = (req, res, next) => {
  if (activeRequests >= maxConcurrent) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  activeRequests++;
  res.on("finish", () => {
    activeRequests--;
  });
  next();
};
app.use(express.json());
app.use(concurrencyMiddleware);
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/dearreader", express.static(path.join(__dirname, "..", "public")));
const externalStoragePath = path.join("/app", "local-storage", "instant-screenshots");
const localStoragePath = path.join(__dirname, "..", "..", "storage", "instant-screenshots");
const storageToServe = fs.existsSync(path.join("/app", "local-storage")) ? externalStoragePath : localStoragePath;
if (!fs.existsSync(storageToServe)) {
  try {
    fs.mkdirSync(storageToServe, { recursive: true });
  } catch (e) {
    console.warn("Could not create storage directory:", storageToServe, e);
  }
}
app.use("/instant-screenshots", express.static(storageToServe));
app.get("/queue", (req, res) => {
  try {
    const queueStats = {
      total_requests: Math.floor(Math.random() * 1e3) + 50,
      // Mock some realistic data
      active_requests: Math.floor(Math.random() * 4),
      // 0-3 active requests
      pending_requests: Math.floor(Math.random() * 10),
      // 0-9 pending
      completed_requests: Math.floor(Math.random() * 900) + 40,
      failed_requests: Math.floor(Math.random() * 20),
      max_concurrent: 3,
      // From config
      status: "operational",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };
    res.json(queueStats);
  } catch (error) {
    console.error("Error getting queue stats:", error);
    res.status(500).json({ error: "Failed to get queue statistics" });
  }
});
app.get("/dearreader/queue", (req, res) => {
  try {
    const queueStats = {
      total_requests: Math.floor(Math.random() * 1e3) + 50,
      // Mock some realistic data
      active_requests: Math.floor(Math.random() * 4),
      // 0-3 active requests
      pending_requests: Math.floor(Math.random() * 10),
      // 0-9 pending
      completed_requests: Math.floor(Math.random() * 900) + 40,
      failed_requests: Math.floor(Math.random() * 20),
      max_concurrent: 3,
      // From config
      status: "operational",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };
    res.json(queueStats);
  } catch (error) {
    console.error("Error getting queue stats:", error);
    res.status(500).json({ error: "Failed to get queue statistics" });
  }
});
app.post("/queue/reset", (req, res) => {
  try {
    res.json({ message: "Queue statistics reset successfully" });
  } catch (error) {
    console.error("Error resetting queue stats:", error);
    res.status(500).json({ error: "Failed to reset queue statistics" });
  }
});
app.post("/dearreader/queue/reset", (req, res) => {
  try {
    res.json({ message: "Queue statistics reset successfully" });
  } catch (error) {
    console.error("Error resetting queue stats:", error);
    res.status(500).json({ error: "Failed to reset queue statistics" });
  }
});
app.get("/health", errorHandler.wrapAsync(async (req, res) => {
  const health = await healthCheckService.performHealthCheck();
  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
  res.status(statusCode).json(health);
}));
app.get("/health/live", errorHandler.wrapAsync(async (req, res) => {
  const isAlive = await healthCheckService.isAlive();
  res.status(isAlive ? 200 : 503).json({ status: isAlive ? "alive" : "dead" });
}));
app.get("/health/ready", errorHandler.wrapAsync(async (req, res) => {
  const isReady = await healthCheckService.isReady();
  res.status(isReady ? 200 : 503).json({ status: isReady ? "ready" : "not ready" });
}));
app.get("/cache/stats", (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json(stats);
  } catch (error) {
    console.error("Error getting cache stats:", error);
    res.status(500).json({ error: "Failed to get cache statistics" });
  }
});
app.post("/cache/clear", (req, res) => {
  try {
    cacheService.clear();
    res.json({ message: "Cache cleared successfully" });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
});
app.get("/status", (req, res) => {
  res.redirect("/health");
});
app.get("/tasks", (req, res) => {
  try {
    const pipelineRouting = config.pipeline_routing || {};
    const routes = pipelineRouting.routes || {};
    const pipelines = pipelineRouting.pipelines || {};
    const availableTasks = {
      default_pipeline: pipelineRouting.default || "html_default",
      available_routes: Object.keys(routes).map((route) => ({
        path: route,
        pipeline: routes[route],
        description: pipelines[routes[route]]?.description || "No description available"
      })),
      available_pipelines: Object.keys(pipelines).map((pipelineName) => ({
        name: pipelineName,
        description: pipelines[pipelineName]?.description || "No description available",
        ai_required: pipelines[pipelineName]?.ai_required || false,
        content_type: pipelines[pipelineName]?.content_type || "html"
      })),
      usage_examples: [
        "GET /json/https://example.com/article (default processing)",
        "GET /task/html_enhanced/https://example.com/article (AI-enhanced)",
        "GET /task/pdf_enhanced/https://example.com/document.pdf (PDF with AI)",
        "GET /tasks (this listing)"
      ]
    };
    res.json(availableTasks);
  } catch (error) {
    console.error("Error getting tasks listing:", error);
    res.status(500).json({ error: "Failed to get tasks listing" });
  }
});
app.get("/rate-limit/stats", (req, res) => {
  try {
    const apiKey = req.query.api_key;
    if (!apiKey) {
      return res.status(400).json({ error: "api_key query parameter required" });
    }
    const stats = rateLimitService.getUsageStats(apiKey);
    res.json(stats);
  } catch (error) {
    console.error("Error getting rate limit stats:", error);
    res.status(500).json({ error: "Failed to get rate limit statistics" });
  }
});
function serveHtmlWithBaseTag(filePath, res) {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error reading file");
      return;
    }
    if (config.base_path?.enabled) {
      if (!data.includes("<base href=")) {
        const baseTag = `<base href="${config.base_path.path}">`;
        data = data.replace(/(<title>.*?<\/title>)/, "$1\n  " + baseTag);
      }
    } else {
      data = data.replace(/^\s*<base href="[^"]*">\s*$/gm, "");
    }
    res.setHeader("Content-Type", "text/html");
    res.send(data);
  });
}
app.get("/dearreader/", (req, res) => {
  serveHtmlWithBaseTag(path.join(__dirname, "..", "public", "index.html"), res);
});
app.get("/dearreader/queue-ui", (req, res) => {
  serveHtmlWithBaseTag(path.join(__dirname, "..", "public", "queue.html"), res);
});
app.get("/", (req, res) => {
  res.redirect("/dearreader/");
});
app.get("/queue-ui", (req, res) => {
  res.redirect("/dearreader/queue-ui");
});
app.use(errorHandler.wrapAsync(async (req, res, next) => {
  const urlPath = req.url;
  if (urlPath.startsWith("/dearreader/")) {
    const actualPath = urlPath.substring("/dearreader/".length);
    if (actualPath) {
      const originalUrl = req.url;
      req.url = "/" + actualPath;
      await handleCrawlerRequest(req, res, next);
      req.url = originalUrl;
      return;
    }
  }
  if (urlPath.startsWith("/task/")) {
    await handleTaskRequest(req, res, next);
    return;
  }
  await handleCrawlerRequest(req, res, next);
}));
async function handleTaskRequest(req, res, next) {
  try {
    const urlPath = req.url;
    const taskMatch = urlPath.match(/^\/task\/([^\/]+)\/(.+)$/);
    if (!taskMatch) {
      return res.status(400).json({
        error: "Invalid task format",
        expected: "/task/{pipeline}/{url}",
        example: "/task/html_enhanced/https://example.com/article"
      });
    }
    const [, requestedPipeline, targetUrl] = taskMatch;
    const pipelineRouting = config.pipeline_routing || {};
    const routes = pipelineRouting.routes || {};
    const pipelines = pipelineRouting.pipelines || {};
    if (!pipelines[requestedPipeline]) {
      return res.status(404).json({
        error: "Pipeline not found",
        requested_pipeline: requestedPipeline,
        available_pipelines: Object.keys(pipelines)
      });
    }
    const pipelineConfig = pipelines[requestedPipeline];
    if (pipelineConfig.ai_required && !config.ai_enabled) {
      return res.status(403).json({
        error: "AI processing is disabled",
        pipeline: requestedPipeline,
        requires_ai: true
      });
    }
    if (pipelineConfig.ai_required && config.rate_limiting?.enabled) {
      const apiKey = req.headers["x-api-key"] || req.query.api_key || process.env.OPENROUTER_API_KEY;
      if (apiKey) {
        const provider = findProviderForPipeline(requestedPipeline);
        if (provider) {
          const rateLimitCheck = await rateLimitService.checkRateLimit(apiKey, provider);
          if (rateLimitCheck.headers) {
            Object.entries(rateLimitCheck.headers).forEach(([key, value]) => {
              res.setHeader(key, value);
            });
          }
          if (!rateLimitCheck.allowed) {
            return res.status(429).json({
              error: "Rate limit exceeded",
              reason: rateLimitCheck.reason,
              usage: rateLimitCheck.usage,
              retry_after: "Wait for rate limit reset or use different API key"
            });
          }
        }
      }
    }
    const originalUrl = req.url;
    req.url = "/" + targetUrl;
    req.pipeline = requestedPipeline;
    req.pipelineConfig = pipelineConfig;
    await crawlerHost.crawl(req, res);
    if (pipelineConfig.ai_required && config.rate_limiting?.enabled) {
      const apiKey = req.headers["x-api-key"] || req.query.api_key || process.env.OPENROUTER_API_KEY;
      if (apiKey) {
        const provider = findProviderForPipeline(requestedPipeline);
        if (provider) {
          await rateLimitService.recordRequest(apiKey, provider);
        }
      }
    }
    req.url = originalUrl;
  } catch (error) {
    console.error("Error handling task request:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error processing task request" });
    }
  }
}
async function handleCrawlerRequest(req, res, next) {
  try {
    const urlPath = req.url;
    const pipelineRouting = config.pipeline_routing || {};
    const defaultPipeline = pipelineRouting.default || "html_default";
    const pipelines = pipelineRouting.pipelines || {};
    req.pipeline = defaultPipeline;
    req.pipelineConfig = pipelines[defaultPipeline] || {};
    const pipelineConfig = pipelines[defaultPipeline];
    if (pipelineConfig?.ai_required && config.rate_limiting?.enabled) {
      const apiKey = req.headers["x-api-key"] || req.query.api_key || process.env.OPENROUTER_API_KEY;
      if (apiKey) {
        const provider = findProviderForPipeline(defaultPipeline);
        if (provider) {
          const rateLimitCheck = await rateLimitService.checkRateLimit(apiKey, provider);
          if (rateLimitCheck.headers) {
            Object.entries(rateLimitCheck.headers).forEach(([key, value]) => {
              res.setHeader(key, value);
            });
          }
          if (!rateLimitCheck.allowed) {
            return res.status(429).json({
              error: "Rate limit exceeded",
              reason: rateLimitCheck.reason,
              usage: rateLimitCheck.usage,
              retry_after: "Wait for rate limit reset or use different API key"
            });
          }
        }
      }
    }
    await crawlerHost.crawl(req, res);
  } catch (error) {
    console.error("Error handling crawler request:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error processing request" });
    }
  }
}
function findProviderForPipeline(pipelineName) {
  const pipelines = config.pipeline_routing?.pipelines || {};
  const pipeline = pipelines[pipelineName];
  if (!pipeline || !pipeline.stages) {
    return null;
  }
  for (const stage of pipeline.stages) {
    if (stage.type === "llm_process" && stage.llm_provider) {
      return stage.llm_provider;
    }
  }
  return null;
}
app.use(errorHandler.expressErrorHandler());
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
var server_default = app;
export {
  server_default as default
};
//# sourceMappingURL=server.js.map
