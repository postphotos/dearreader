var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import fs from 'fs';
import path from 'path';
import { singleton } from 'tsyringe';
import { Logger } from '../shared/logger.js';
import * as yaml from 'js-yaml';
let RateLimitService = class RateLimitService {
    constructor() {
        this.usageRecords = new Map();
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
    }
    loadRateLimitConfig() {
        try {
            const configPath = path.resolve(__dirname, '..', '..', '..', 'crawl_pipeline.yaml');
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, 'utf8');
                const fullConfig = yaml.load(configContent);
                this.rateLimitConfig = fullConfig.rate_limiting;
                this.logger.info('Rate limiting configuration loaded from crawl_pipeline.yaml');
            }
            else {
                this.logger.warn('crawl_pipeline.yaml not found, using default rate limiting config');
                this.rateLimitConfig = {
                    enabled: false,
                    usage_log_path: './logs/api_usage.log',
                    daily_reset_hour: 0,
                    warning_threshold: 80,
                    providers: {}
                };
            }
        }
        catch (error) {
            this.logger.error('Failed to load rate limiting config:', error);
            this.rateLimitConfig = { enabled: false, providers: {} };
        }
    }
    /**
     * Check if a request is allowed for the given API key and provider
     */
    async checkRateLimit(apiKey, provider) {
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
                last_request_time: now
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
            return { allowed: false, reason, usage: record };
        }
        if (record.requests_this_minute >= limits.rpm_limit) {
            const reason = `Minute limit exceeded: ${record.requests_this_minute}/${limits.rpm_limit} requests`;
            this.logger.warn(`Rate limit exceeded for ${key}: ${reason}`);
            return { allowed: false, reason, usage: record };
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
        return { allowed: true, usage: record };
    }
    /**
     * Record a successful request
     */
    async recordRequest(apiKey, provider) {
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
                last_request_time: now
            };
        }
        // Update counters
        record.requests_today++;
        record.requests_this_minute++;
        record.last_request_time = now;
        this.usageRecords.set(key, record);
        // Save to log file
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
                const data = fs.readFileSync(this.logPath, 'utf8');
                const lines = data.trim().split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const record = JSON.parse(line);
                            const key = `${record.api_key}:${record.provider}`;
                            // Only load records from today
                            const today = new Date().toDateString();
                            if (new Date(record.timestamp).toDateString() === today) {
                                this.usageRecords.set(key, record);
                            }
                        }
                        catch (e) {
                            this.logger.warn(`Failed to parse usage record: ${line}`);
                        }
                    }
                }
                this.logger.info(`Loaded ${this.usageRecords.size} usage records from ${this.logPath}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to load usage records: ${error}`);
        }
    }
    /**
     * Save usage record to log file
     */
    async saveUsageRecord(record) {
        try {
            const logEntry = JSON.stringify(record) + '\n';
            fs.appendFileSync(this.logPath, logEntry);
        }
        catch (error) {
            this.logger.error(`Failed to save usage record: ${error}`);
        }
    }
    /**
     * Schedule daily reset of usage counters
     */
    scheduleDailyReset() {
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
    resetDailyCounters() {
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
     * Clean up old records (keep only last 30 days)
     */
    cleanupOldRecords() {
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
};
RateLimitService = __decorate([
    singleton(),
    __metadata("design:paramtypes", [])
], RateLimitService);
export { RateLimitService };
//# sourceMappingURL=rate-limit.js.map