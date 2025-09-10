
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

import "reflect-metadata";
import express from "express";
import { concurrencyMiddleware } from "./middleware/concurrency.js";
import { CrawlerHost } from "./cloud-functions/crawler.js";
import { Logger } from "./shared/logger.js";
import { container } from "tsyringe";
import { PuppeteerControl } from "./services/puppeteer.js";
import { JSDomControl } from "./services/jsdom.js";
import { FirebaseStorageBucketControl } from "./shared/index.js";
import { AsyncContext } from "./shared/index.js";
const app = express();
app.use(express.json());
app.use(concurrencyMiddleware);
container.registerSingleton(Logger);
container.registerSingleton(PuppeteerControl);
container.registerSingleton(JSDomControl);
container.registerSingleton(FirebaseStorageBucketControl);
container.registerSingleton(AsyncContext);
container.registerSingleton(CrawlerHost);
const crawlerHost = container.resolve(CrawlerHost);
app.post("/crawl", async (req, res) => {
  try {
    await crawlerHost.crawl(req, res);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
});
app.get("/", (req, res) => {
  res.json({ message: "DearReader Local Crawler Server Running" });
});
var src_default = app;
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.nextTick(() => process.exit(1));
  console.error("Uncaught exception, process quit.");
  throw err;
});
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
