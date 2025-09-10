import fs from 'fs';
import path from 'path';
import { singleton } from 'tsyringe';
import { Logger } from '../shared/logger.js';
import * as yaml from 'js-yaml';

export interface RateLimitConfig {
  rpm_limit: number;
  rpd_limit: number;
}

export interface UsageRecord {
  api_key: string;
  provider: string;
  timestamp: number;
  requests_today: number;
  requests_this_minute: number;
  last_request_time: number;
  // Sliding window data
  request_timestamps: number[]; // Timestamps of recent requests
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  usage?: UsageRecord;
  headers?: {
    'X-RateLimit-Limit': string;
    'X-RateLimit-Remaining': string;
    'X-RateLimit-Reset': string;
    'X-RateLimit-Window'?: string;
  };
}

@singleton()
export class RateLimitService {
  private usageRecords: Map<string, UsageRecord> = new Map();
  private logPath: string;
  private logger: Logger;
  private rateLimitConfig: any;
  private slidingWindowSize: number = 60 * 1000; // 1 minute sliding window

  constructor() {
    this.logger = new Logger('RateLimit');
    this.loadRateLimitConfig();
    this.logPath = path.resolve(this.rateLimitConfig?.usage_log_path || './logs/api_usage.log');

    // Ensure log directory exists
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Load existing usage records
    this.loadUsageRecords();

    // Set up daily reset
    this.scheduleDailyReset();

    // Set up periodic cleanup
    this.scheduleCleanup();
  }

  private loadRateLimitConfig(): void {
    try {
      const configPath = path.resolve(__dirname, '..', '..', '..', 'crawl_pipeline.yaml');
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const fullConfig = yaml.load(configContent) as any;
        this.rateLimitConfig = fullConfig.rate_limiting;
        this.logger.info('Rate limiting configuration loaded from crawl_pipeline.yaml');
      } else {
        this.logger.warn('crawl_pipeline.yaml not found, using default rate limiting config');
        this.rateLimitConfig = {
          enabled: false,
          usage_log_path: './logs/api_usage.log',
          daily_reset_hour: 0,
          warning_threshold: 80,
          providers: {}
        };
      }
    } catch (error) {
      this.logger.error('Failed to load rate limiting config:', error);
      this.rateLimitConfig = { enabled: false, providers: {} };
    }
  }

  /**
   * Check if a request is allowed for the given API key and provider
   */
  async checkRateLimit(apiKey: string, provider: string): Promise<RateLimitResult> {
    const key = `${apiKey}:${provider}`;
    const now = Date.now();
    const today = new Date().toDateString();
    const thisMinute = Math.floor(now / 60000); // 60 second windows

    // Get or create usage record
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

    // Reset counters if it's a new day
    if (new Date(record.timestamp).toDateString() !== today) {
      record.requests_today = 0;
      record.timestamp = now;
    }

    // Reset minute counter if it's a new minute
    if (Math.floor(record.last_request_time / 60000) !== thisMinute) {
      record.requests_this_minute = 0;
    }

    // Get provider limits
    const limits = this.getProviderLimits(provider);
    if (!limits) {
      return { allowed: true, usage: record }; // No limits defined, allow
    }

    // Check limits
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

    // Check warning threshold
    const warningThreshold = this.rateLimitConfig?.warning_threshold || 80;
    const dailyUsagePercent = (record.requests_today / limits.rpd_limit) * 100;
    const minuteUsagePercent = (record.requests_this_minute / limits.rpm_limit) * 100;

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
  async recordRequest(apiKey: string, provider: string): Promise<void> {
    const key = `${apiKey}:${provider}`;
    const now = Date.now();
    const thisMinute = Math.floor(now / 60000);

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

    // Update counters
    record.requests_today++;
    record.requests_this_minute++;
    record.last_request_time = now;

    // Add timestamp for sliding window
    record.request_timestamps.push(now);

    // Keep only timestamps within the sliding window
    const windowStart = now - this.slidingWindowSize;
    record.request_timestamps = record.request_timestamps.filter(ts => ts > windowStart);

    this.usageRecords.set(key, record);

    // Save to log file
    await this.saveUsageRecord(record);
  }

  /**
   * Get usage statistics for an API key
   */
  getUsageStats(apiKey: string, provider?: string): { [key: string]: UsageRecord } {
    const stats: { [key: string]: UsageRecord } = {};

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
  private getProviderLimits(provider: string): RateLimitConfig | null {
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
  private loadUsageRecords(): void {
    try {
      if (fs.existsSync(this.logPath)) {
        const data = fs.readFileSync(this.logPath, 'utf8');
        const lines = data.trim().split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const record: UsageRecord = JSON.parse(line);
              const key = `${record.api_key}:${record.provider}`;

              // Only load records from today
              const today = new Date().toDateString();
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
  private async saveUsageRecord(record: UsageRecord): Promise<void> {
    try {
      const logEntry = JSON.stringify(record) + '\n';
      fs.appendFileSync(this.logPath, logEntry);
    } catch (error) {
      this.logger.error(`Failed to save usage record: ${error}`);
    }
  }

  /**
   * Schedule daily reset of usage counters
   */
  private scheduleDailyReset(): void {
    const resetHour = this.rateLimitConfig?.daily_reset_hour || 0;

    const scheduleReset = () => {
      const now = new Date();
      const resetTime = new Date(now);
      resetTime.setHours(resetHour, 0, 0, 0);

      // If reset time has passed today, schedule for tomorrow
      if (now >= resetTime) {
        resetTime.setDate(resetTime.getDate() + 1);
      }

      const timeUntilReset = resetTime.getTime() - now.getTime();

      setTimeout(() => {
        this.resetDailyCounters();
        // Schedule next reset
        setTimeout(scheduleReset, 24 * 60 * 60 * 1000); // 24 hours
      }, timeUntilReset);
    };

    scheduleReset();
  }

  /**
   * Reset daily usage counters
   */
  private resetDailyCounters(): void {
    const today = new Date().toDateString();

    for (const [key, record] of this.usageRecords.entries()) {
      // Reset if record is from yesterday
      if (new Date(record.timestamp).toDateString() !== today) {
        record.requests_today = 0;
        record.timestamp = Date.now();
        this.usageRecords.set(key, record);
      }
    }

    this.logger.info('Daily usage counters reset');
  }

  /**
   * Generate rate limit headers for response
   */
  private generateRateLimitHeaders(record: UsageRecord, limits: RateLimitConfig, provider: string): RateLimitResult['headers'] {
    const now = Date.now();
    const resetTime = new Date();
    resetTime.setHours(23, 59, 59, 999); // End of today
    const resetTimestamp = Math.floor(resetTime.getTime() / 1000);

    // Calculate remaining requests
    const remainingDaily = Math.max(0, limits.rpd_limit - record.requests_today);
    const remainingMinute = Math.max(0, limits.rpm_limit - record.requests_this_minute);

    return {
      'X-RateLimit-Limit': `${limits.rpm_limit}`,
      'X-RateLimit-Remaining': `${Math.min(remainingDaily, remainingMinute)}`,
      'X-RateLimit-Reset': `${resetTimestamp}`,
      'X-RateLimit-Window': '60' // 60 second window
    };
  }

  /**
   * Schedule periodic cleanup of old records
   */
  private scheduleCleanup(): void {
    setInterval(() => {
      this.cleanupOldRecords();
    }, 60 * 60 * 1000); // Run cleanup every hour
  }

  /**
   * Clean up old records (keep only last 30 days)
   */
  cleanupOldRecords(): void {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
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
}