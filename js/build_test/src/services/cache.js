var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import NodeCache from 'node-cache';
import { singleton } from 'tsyringe';
import { Logger } from '../shared/logger.js';
import { config } from '../shared/config-manager.js';
import { createHash } from 'crypto';
let ResponseCacheService = class ResponseCacheService {
    constructor() {
        this.logger = new Logger('ResponseCache');
        this.cache = new NodeCache({
            stdTTL: 600, // 10 minutes default TTL
            maxKeys: config.cache.cache_size_limit,
            checkperiod: 120, // Check for expired keys every 2 minutes
            useClones: false // Better performance, but be careful with mutations
        });
        this.cache.on('set', (key, value) => {
            this.logger.debug('Cache entry set', { key, size: JSON.stringify(value).length });
        });
        this.cache.on('expired', (key) => {
            this.logger.debug('Cache entry expired', { key });
        });
        this.cache.on('del', (key) => {
            this.logger.debug('Cache entry deleted', { key });
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
        return createHash('md5').update(keyString).digest('hex');
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
            this.logger.debug('Cache hit', { key, url });
            return cached.data;
        }
        this.logger.debug('Cache miss', { key, url });
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
        const ttl = ttlSeconds || 600; // 10 minutes default
        const entry = {
            data,
            timestamp: Date.now(),
            ttl
        };
        const success = this.cache.set(key, entry, ttl);
        if (success) {
            this.logger.debug('Cache entry stored', {
                key,
                url,
                ttl,
                size: JSON.stringify(data).length
            });
        }
        else {
            this.logger.warn('Failed to store cache entry', { key, url });
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
            this.logger.debug('Cache entry deleted', { key, url });
        }
        return deleted > 0;
    }
    /**
     * Clear all cached responses
     */
    clear() {
        this.cache.flushAll();
        this.logger.info('All cache entries cleared');
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
        if (!options?.cookies) { // Don't cache if cookies were used (privacy)
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
        // Base TTL of 10 minutes
        let ttl = 600;
        // If content has a published date, cache longer for older content
        if (content.publishedTime) {
            const publishedDate = new Date(content.publishedTime);
            const ageInDays = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (ageInDays > 365) {
                ttl = 3600; // 1 hour for content older than a year
            }
            else if (ageInDays > 30) {
                ttl = 1800; // 30 minutes for content older than a month
            }
        }
        // Shorter TTL for dynamic content indicators
        if (content.title?.toLowerCase().includes('live') ||
            content.title?.toLowerCase().includes('breaking') ||
            content.content?.toLowerCase().includes('updated')) {
            ttl = 300; // 5 minutes for live/breaking content
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
                // This would typically trigger a background fetch
                // For now, just log the URLs that would be warmed
                this.logger.debug('URL not in cache, would warm', { url });
            }
        }
    }
    /**
     * Cleanup expired entries (called periodically)
     */
    cleanup() {
        const beforeKeys = this.cache.keys().length;
        // Force check for expired keys
        this.cache.keys().forEach(key => this.cache.get(key));
        const afterKeys = this.cache.keys().length;
        if (beforeKeys !== afterKeys) {
            this.logger.info('Cache cleanup completed', {
                removedEntries: beforeKeys - afterKeys,
                remainingEntries: afterKeys
            });
        }
    }
};
ResponseCacheService = __decorate([
    singleton(),
    __metadata("design:paramtypes", [])
], ResponseCacheService);
export { ResponseCacheService };
//# sourceMappingURL=cache.js.map