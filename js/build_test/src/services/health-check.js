
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

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};
import { singleton } from "tsyringe";
import { Logger } from "../shared/logger.js";
import { config } from "../shared/config-manager.js";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
let HealthCheckService = class {
  constructor(cacheService) {
    this.cacheService = cacheService;
    this.logger = new Logger("HealthCheck");
    this.startTime = Date.now();
  }
  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now();
    const checks = {};
    const checkPromises = [
      this.checkMemoryUsage(),
      this.checkStorageHealth(),
      this.checkCacheHealth(),
      this.checkConfigHealth(),
      this.checkSystemResources()
    ];
    const results = await Promise.allSettled(checkPromises);
    checks.memory = this.processResult(results[0], "memory");
    checks.storage = this.processResult(results[1], "storage");
    checks.cache = this.processResult(results[2], "cache");
    checks.config = this.processResult(results[3], "config");
    checks.system = this.processResult(results[4], "system");
    const overallStatus = this.determineOverallStatus(checks);
    const responseTime = Date.now() - startTime;
    const health = {
      status: overallStatus,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || "1.0.0",
      checks
    };
    this.logger.info("Health check completed", {
      status: overallStatus,
      responseTime,
      failedChecks: Object.entries(checks).filter(([, check]) => check.status === "fail").map(([name]) => name)
    });
    return health;
  }
  /**
   * Check memory usage
   */
  async checkMemoryUsage() {
    const start = Date.now();
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memUsage.rss / 1024 / 1024);
      const heapUsagePercent = heapUsedMB / heapTotalMB * 100;
      let status = "pass";
      if (heapUsagePercent > 90 || rssMB > 1024) {
        status = heapUsagePercent > 98 || rssMB > 2048 ? "fail" : "warn";
      }
      return {
        status,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        responseTime: Date.now() - start,
        details: {
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${heapTotalMB}MB`,
          rss: `${rssMB}MB`,
          heapUsagePercent: `${heapUsagePercent.toFixed(1)}%`
        }
      };
    } catch (error) {
      return {
        status: "fail",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }
  /**
   * Check storage health
   */
  async checkStorageHealth() {
    const start = Date.now();
    try {
      const storageDir = config.storage.local_directory;
      const testFile = path.join(storageDir, "health-check-test.tmp");
      await fs.mkdir(storageDir, { recursive: true });
      await fs.writeFile(testFile, "health-check-test", "utf8");
      const content = await fs.readFile(testFile, "utf8");
      await fs.unlink(testFile);
      if (content !== "health-check-test") {
        throw new Error("Storage read/write test failed");
      }
      return {
        status: "pass",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        responseTime: Date.now() - start,
        details: {
          directory: storageDir,
          writable: true,
          readable: true
        }
      };
    } catch (error) {
      return {
        status: "fail",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }
  /**
   * Check cache health
   */
  async checkCacheHealth() {
    const start = Date.now();
    try {
      const cacheStats = this.cacheService.getStats();
      return {
        status: "pass",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        responseTime: Date.now() - start,
        details: {
          enabled: cacheStats.enabled,
          keys: cacheStats.keys,
          hitRate: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
          hits: cacheStats.hits,
          misses: cacheStats.misses
        }
      };
    } catch (error) {
      return {
        status: "fail",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }
  async checkConfigHealth() {
    const start = Date.now();
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const configPath = path.resolve(__dirname, "..", "..", "..", "config.yaml");
      let configExists = false;
      try {
        await fs.access(configPath);
        configExists = true;
      } catch {
      }
      return {
        status: "pass",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        responseTime: Date.now() - start,
        details: {
          configFileExists: configExists,
          environment: process.env.NODE_ENV || "development"
        }
      };
    } catch (error) {
      return {
        status: "fail",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }
  async checkSystemResources() {
    const start = Date.now();
    try {
      return {
        status: "pass",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        responseTime: Date.now() - start,
        details: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: `${Math.floor(process.uptime())}s`
        }
      };
    } catch (error) {
      return {
        status: "fail",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }
  processResult(result, name) {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      this.logger.error(`Health check failed: ${name}`, { error: result.reason });
      return {
        status: "fail",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: result.reason?.message || "Health check failed"
      };
    }
  }
  determineOverallStatus(checks) {
    const statuses = Object.values(checks).map((check) => check.status);
    if (statuses.includes("fail")) {
      return "unhealthy";
    } else if (statuses.includes("warn")) {
      return "degraded";
    } else {
      return "healthy";
    }
  }
  async isAlive() {
    try {
      return process.uptime() > 0;
    } catch {
      return false;
    }
  }
  async isReady() {
    try {
      const health = await this.performHealthCheck();
      return health.status === "healthy" || health.status === "degraded";
    } catch {
      return false;
    }
  }
};
HealthCheckService = __decorateClass([
  singleton()
], HealthCheckService);
export {
  HealthCheckService
};
//# sourceMappingURL=health-check.js.map
