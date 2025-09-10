
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
import NodeCache from "node-cache";
import { singleton } from "tsyringe";
import { Logger } from "../shared/logger.js";
import { config } from "../shared/config-manager.js";
import { createHash } from "crypto";
let ResponseCacheService = class {
  constructor() {
    this.logger = new Logger("ResponseCache");
    this.cache = new NodeCache({
      stdTTL: 600,
      // 10 minutes default TTL
      maxKeys: config.cache.cache_size_limit,
      checkperiod: 120,
      // Check for expired keys every 2 minutes
      useClones: false
      // Better performance, but be careful with mutations
    });
    this.cache.on("set", (key, value) => {
      this.logger.debug("Cache entry set", { key, size: JSON.stringify(value).length });
    });
    this.cache.on("expired", (key) => {
      this.logger.debug("Cache entry expired", { key });
    });
    this.cache.on("del", (key) => {
      this.logger.debug("Cache entry deleted", { key });
    });
  }
  /**
   * Generate a cache key from URL and options
   */
  generateKey(url, options) {
    const keyData = {
      url: url.toLowerCase().trim(),
      ...options
    };
    const keyString = JSON.stringify(keyData, Object.keys(keyData).sort());
    return createHash("md5").update(keyString).digest("hex");
  }
  /**
   * Get cached response
   */
  get(url, options) {
    if (!config.cache.enable_response_cache) {
      return null;
    }
    const key = this.generateKey(url, options);
    const cached = this.cache.get(key);
    if (cached) {
      this.logger.debug("Cache hit", { key, url });
      return cached.data;
    }
    this.logger.debug("Cache miss", { key, url });
    return null;
  }
  /**
   * Set cached response
   */
  set(url, data, ttlSeconds, options) {
    if (!config.cache.enable_response_cache) {
      return false;
    }
    const key = this.generateKey(url, options);
    const ttl = ttlSeconds || 600;
    const entry = {
      data,
      timestamp: Date.now(),
      ttl
    };
    const success = this.cache.set(key, entry, ttl);
    if (success) {
      this.logger.debug("Cache entry stored", {
        key,
        url,
        ttl,
        size: JSON.stringify(data).length
      });
    } else {
      this.logger.warn("Failed to store cache entry", { key, url });
    }
    return success;
  }
  /**
   * Delete cached response
   */
  delete(url, options) {
    const key = this.generateKey(url, options);
    const deleted = this.cache.del(key);
    if (deleted > 0) {
      this.logger.debug("Cache entry deleted", { key, url });
    }
    return deleted > 0;
  }
  /**
   * Clear all cached responses
   */
  clear() {
    this.cache.flushAll();
    this.logger.info("All cache entries cleared");
  }
  /**
   * Get cache statistics
   */
  getStats() {
    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
      enabled: config.cache.enable_response_cache
    };
  }
  /**
   * Check if caching is enabled
   */
  isEnabled() {
    return config.cache.enable_response_cache;
  }
  /**
   * Cache content extraction results
   */
  cacheContentExtraction(url, content, options) {
    if (!options?.cookies) {
      const ttl = this.determineTTL(content);
      return this.set(url, content, ttl, options);
    }
    return false;
  }
  /**
   * Get cached content extraction
   */
  getCachedContentExtraction(url, options) {
    return this.get(url, options);
  }
  /**
   * Determine appropriate TTL based on content type and freshness
   */
  determineTTL(content) {
    let ttl = 600;
    if (content.publishedTime) {
      const publishedDate = new Date(content.publishedTime);
      const ageInDays = (Date.now() - publishedDate.getTime()) / (1e3 * 60 * 60 * 24);
      if (ageInDays > 365) {
        ttl = 3600;
      } else if (ageInDays > 30) {
        ttl = 1800;
      }
    }
    if (content.title?.toLowerCase().includes("live") || content.title?.toLowerCase().includes("breaking") || content.content?.toLowerCase().includes("updated")) {
      ttl = 300;
    }
    return ttl;
  }
  /**
   * Warm cache with common URLs
   */
  async warmCache(urls) {
    this.logger.info(`Warming cache with ${urls.length} URLs`);
    for (const url of urls) {
      if (!this.get(url)) {
        this.logger.debug("URL not in cache, would warm", { url });
      }
    }
  }
  /**
   * Cleanup expired entries (called periodically)
   */
  cleanup() {
    const beforeKeys = this.cache.keys().length;
    this.cache.keys().forEach((key) => this.cache.get(key));
    const afterKeys = this.cache.keys().length;
    if (beforeKeys !== afterKeys) {
      this.logger.info("Cache cleanup completed", {
        removedEntries: beforeKeys - afterKeys,
        remainingEntries: afterKeys
      });
    }
  }
};
ResponseCacheService = __decorateClass([
  singleton()
], ResponseCacheService);
export {
  ResponseCacheService
};
//# sourceMappingURL=cache.js.map
