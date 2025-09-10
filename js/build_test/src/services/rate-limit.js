
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
import fs from "fs";
import path from "path";
import { singleton } from "tsyringe";
import { Logger } from "../shared/logger.js";
import * as yaml from "js-yaml";
let RateLimitService = class {
  // 1 minute sliding window
  constructor() {
    this.usageRecords = /* @__PURE__ */ new Map();
    this.slidingWindowSize = 60 * 1e3;
    this.logger = new Logger("RateLimit");
    this.loadRateLimitConfig();
    this.logPath = path.resolve(this.rateLimitConfig?.usage_log_path || "./logs/api_usage.log");
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.loadUsageRecords();
    this.scheduleDailyReset();
    this.scheduleCleanup();
  }
  loadRateLimitConfig() {
    try {
      const configPath = path.resolve(__dirname, "..", "..", "..", "crawl_pipeline.yaml");
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, "utf8");
        const fullConfig = yaml.load(configContent);
        this.rateLimitConfig = fullConfig.rate_limiting;
        this.logger.info("Rate limiting configuration loaded from crawl_pipeline.yaml");
      } else {
        this.logger.warn("crawl_pipeline.yaml not found, using default rate limiting config");
        this.rateLimitConfig = {
          enabled: false,
          usage_log_path: "./logs/api_usage.log",
          daily_reset_hour: 0,
          warning_threshold: 80,
          providers: {}
        };
      }
    } catch (error) {
      this.logger.error("Failed to load rate limiting config:", error);
      this.rateLimitConfig = { enabled: false, providers: {} };
    }
  }
  /**
   * Check if a request is allowed for the given API key and provider
   */
  async checkRateLimit(apiKey, provider) {
    const key = `${apiKey}:${provider}`;
    const now = Date.now();
    const today = (/* @__PURE__ */ new Date()).toDateString();
    const thisMinute = Math.floor(now / 6e4);
    let record = this.usageRecords.get(key);
    if (!record) {
      record = {
        api_key: apiKey,
        provider,
        timestamp: now,
        requests_today: 0,
        requests_this_minute: 0,
        last_request_time: now,
        request_timestamps: []
      };
      this.usageRecords.set(key, record);
    }
    if (new Date(record.timestamp).toDateString() !== today) {
      record.requests_today = 0;
      record.timestamp = now;
    }
    if (Math.floor(record.last_request_time / 6e4) !== thisMinute) {
      record.requests_this_minute = 0;
    }
    const limits = this.getProviderLimits(provider);
    if (!limits) {
      return { allowed: true, usage: record };
    }
    if (record.requests_today >= limits.rpd_limit) {
      const reason = `Daily limit exceeded: ${record.requests_today}/${limits.rpd_limit} requests`;
      this.logger.warn(`Rate limit exceeded for ${key}: ${reason}`);
      return {
        allowed: false,
        reason,
        usage: record,
        headers: this.generateRateLimitHeaders(record, limits, provider)
      };
    }
    if (record.requests_this_minute >= limits.rpm_limit) {
      const reason = `Minute limit exceeded: ${record.requests_this_minute}/${limits.rpm_limit} requests`;
      this.logger.warn(`Rate limit exceeded for ${key}: ${reason}`);
      return {
        allowed: false,
        reason,
        usage: record,
        headers: this.generateRateLimitHeaders(record, limits, provider)
      };
    }
    const warningThreshold = this.rateLimitConfig?.warning_threshold || 80;
    const dailyUsagePercent = record.requests_today / limits.rpd_limit * 100;
    const minuteUsagePercent = record.requests_this_minute / limits.rpm_limit * 100;
    if (dailyUsagePercent >= warningThreshold) {
      this.logger.warn(`High daily usage for ${key}: ${record.requests_today}/${limits.rpd_limit} (${dailyUsagePercent.toFixed(1)}%)`);
    }
    if (minuteUsagePercent >= warningThreshold) {
      this.logger.warn(`High minute usage for ${key}: ${record.requests_this_minute}/${limits.rpm_limit} (${minuteUsagePercent.toFixed(1)}%)`);
    }
    return {
      allowed: true,
      usage: record,
      headers: this.generateRateLimitHeaders(record, limits, provider)
    };
  }
  /**
   * Record a successful request
   */
  async recordRequest(apiKey, provider) {
    const key = `${apiKey}:${provider}`;
    const now = Date.now();
    const thisMinute = Math.floor(now / 6e4);
    let record = this.usageRecords.get(key);
    if (!record) {
      record = {
        api_key: apiKey,
        provider,
        timestamp: now,
        requests_today: 0,
        requests_this_minute: 0,
        last_request_time: now,
        request_timestamps: []
      };
    }
    record.requests_today++;
    record.requests_this_minute++;
    record.last_request_time = now;
    record.request_timestamps.push(now);
    const windowStart = now - this.slidingWindowSize;
    record.request_timestamps = record.request_timestamps.filter((ts) => ts > windowStart);
    this.usageRecords.set(key, record);
    await this.saveUsageRecord(record);
  }
  /**
   * Get usage statistics for an API key
   */
  getUsageStats(apiKey, provider) {
    const stats = {};
    for (const [key, record] of this.usageRecords.entries()) {
      if (record.api_key === apiKey && (!provider || key.endsWith(`:${provider}`))) {
        stats[key] = { ...record };
      }
    }
    return stats;
  }
  /**
   * Get provider-specific rate limits
   */
  getProviderLimits(provider) {
    const providers = this.rateLimitConfig?.providers;
    if (!providers || !providers[provider]) {
      return null;
    }
    return {
      rpm_limit: providers[provider].rpm_limit,
      rpd_limit: providers[provider].rpd_limit
    };
  }
  /**
   * Load usage records from log file
   */
  loadUsageRecords() {
    try {
      if (fs.existsSync(this.logPath)) {
        const data = fs.readFileSync(this.logPath, "utf8");
        const lines = data.trim().split("\n");
        for (const line of lines) {
          if (line.trim()) {
            try {
              const record = JSON.parse(line);
              const key = `${record.api_key}:${record.provider}`;
              const today = (/* @__PURE__ */ new Date()).toDateString();
              if (new Date(record.timestamp).toDateString() === today) {
                this.usageRecords.set(key, record);
              }
            } catch (e) {
              this.logger.warn(`Failed to parse usage record: ${line}`);
            }
          }
        }
        this.logger.info(`Loaded ${this.usageRecords.size} usage records from ${this.logPath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load usage records: ${error}`);
    }
  }
  /**
   * Save usage record to log file
   */
  async saveUsageRecord(record) {
    try {
      const logEntry = JSON.stringify(record) + "\n";
      fs.appendFileSync(this.logPath, logEntry);
    } catch (error) {
      this.logger.error(`Failed to save usage record: ${error}`);
    }
  }
  /**
   * Schedule daily reset of usage counters
   */
  scheduleDailyReset() {
    const resetHour = this.rateLimitConfig?.daily_reset_hour || 0;
    const scheduleReset = () => {
      const now = /* @__PURE__ */ new Date();
      const resetTime = new Date(now);
      resetTime.setHours(resetHour, 0, 0, 0);
      if (now >= resetTime) {
        resetTime.setDate(resetTime.getDate() + 1);
      }
      const timeUntilReset = resetTime.getTime() - now.getTime();
      setTimeout(() => {
        this.resetDailyCounters();
        setTimeout(scheduleReset, 24 * 60 * 60 * 1e3);
      }, timeUntilReset);
    };
    scheduleReset();
  }
  /**
   * Reset daily usage counters
   */
  resetDailyCounters() {
    const today = (/* @__PURE__ */ new Date()).toDateString();
    for (const [key, record] of this.usageRecords.entries()) {
      if (new Date(record.timestamp).toDateString() !== today) {
        record.requests_today = 0;
        record.timestamp = Date.now();
        this.usageRecords.set(key, record);
      }
    }
    this.logger.info("Daily usage counters reset");
  }
  /**
   * Generate rate limit headers for response
   */
  generateRateLimitHeaders(record, limits, provider) {
    const now = Date.now();
    const resetTime = /* @__PURE__ */ new Date();
    resetTime.setHours(23, 59, 59, 999);
    const resetTimestamp = Math.floor(resetTime.getTime() / 1e3);
    const remainingDaily = Math.max(0, limits.rpd_limit - record.requests_today);
    const remainingMinute = Math.max(0, limits.rpm_limit - record.requests_this_minute);
    return {
      "X-RateLimit-Limit": `${limits.rpm_limit}`,
      "X-RateLimit-Remaining": `${Math.min(remainingDaily, remainingMinute)}`,
      "X-RateLimit-Reset": `${resetTimestamp}`,
      "X-RateLimit-Window": "60"
      // 60 second window
    };
  }
  /**
   * Schedule periodic cleanup of old records
   */
  scheduleCleanup() {
    setInterval(() => {
      this.cleanupOldRecords();
    }, 60 * 60 * 1e3);
  }
  /**
   * Clean up old records (keep only last 30 days)
   */
  cleanupOldRecords() {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1e3;
    let removed = 0;
    for (const [key, record] of this.usageRecords.entries()) {
      if (record.timestamp < thirtyDaysAgo) {
        this.usageRecords.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.info(`Cleaned up ${removed} old usage records`);
    }
  }
};
RateLimitService = __decorateClass([
  singleton()
], RateLimitService);
export {
  RateLimitService
};
//# sourceMappingURL=rate-limit.js.map
