var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { singleton } from 'tsyringe';
import { Logger } from '../shared/logger.js';
import { config } from '../shared/config-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ResponseCacheService } from './cache.js';
let HealthCheckService = class HealthCheckService {
    constructor(cacheService) {
        this.cacheService = cacheService;
        this.logger = new Logger('HealthCheck');
        this.startTime = Date.now();
    }
    /**
     * Perform comprehensive health check
     */
    async performHealthCheck() {
        const startTime = Date.now();
        const checks = {};
        // Run all health checks in parallel
        const checkPromises = [
            this.checkMemoryUsage(),
            this.checkStorageHealth(),
            this.checkCacheHealth(),
            this.checkConfigHealth(),
            this.checkSystemResources()
        ];
        const results = await Promise.allSettled(checkPromises);
        // Process results
        checks.memory = this.processResult(results[0], 'memory');
        checks.storage = this.processResult(results[1], 'storage');
        checks.cache = this.processResult(results[2], 'cache');
        checks.config = this.processResult(results[3], 'config');
        checks.system = this.processResult(results[4], 'system');
        // Determine overall status
        const overallStatus = this.determineOverallStatus(checks);
        const responseTime = Date.now() - startTime;
        const health = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            version: process.env.npm_package_version || '1.0.0',
            checks
        };
        this.logger.info('Health check completed', {
            status: overallStatus,
            responseTime,
            failedChecks: Object.entries(checks)
                .filter(([, check]) => check.status === 'fail')
                .map(([name]) => name)
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
            const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
            let status = 'pass';
            if (heapUsagePercent > 85 || rssMB > 1024) {
                status = heapUsagePercent > 95 || rssMB > 2048 ? 'fail' : 'warn';
            }
            return {
                status,
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - start,
                details: {
                    heapUsed: `${heapUsedMB}MB`,
                    heapTotal: `${heapTotalMB}MB`,
                    rss: `${rssMB}MB`,
                    heapUsagePercent: `${heapUsagePercent.toFixed(1)}%`
                }
            };
        }
        catch (error) {
            return {
                status: 'fail',
                timestamp: new Date().toISOString(),
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
            const testFile = path.join(storageDir, 'health-check-test.tmp');
            await fs.mkdir(storageDir, { recursive: true });
            await fs.writeFile(testFile, 'health-check-test', 'utf8');
            const content = await fs.readFile(testFile, 'utf8');
            await fs.unlink(testFile);
            if (content !== 'health-check-test') {
                throw new Error('Storage read/write test failed');
            }
            return {
                status: 'pass',
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - start,
                details: {
                    directory: storageDir,
                    writable: true,
                    readable: true
                }
            };
        }
        catch (error) {
            return {
                status: 'fail',
                timestamp: new Date().toISOString(),
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
                status: 'pass',
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - start,
                details: {
                    enabled: cacheStats.enabled,
                    keys: cacheStats.keys,
                    hitRate: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
                    hits: cacheStats.hits,
                    misses: cacheStats.misses
                }
            };
        }
        catch (error) {
            return {
                status: 'fail',
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - start,
                error: error.message
            };
        }
    }
    async checkConfigHealth() {
        const start = Date.now();
        try {
            const configPath = path.join(process.cwd(), 'config.yaml');
            let configExists = false;
            try {
                await fs.access(configPath);
                configExists = true;
            }
            catch {
                // Using defaults
            }
            return {
                status: 'pass',
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - start,
                details: {
                    configFileExists: configExists,
                    environment: process.env.NODE_ENV || 'development'
                }
            };
        }
        catch (error) {
            return {
                status: 'fail',
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - start,
                error: error.message
            };
        }
    }
    async checkSystemResources() {
        const start = Date.now();
        try {
            return {
                status: 'pass',
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - start,
                details: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    uptime: `${Math.floor(process.uptime())}s`
                }
            };
        }
        catch (error) {
            return {
                status: 'fail',
                timestamp: new Date().toISOString(),
                responseTime: Date.now() - start,
                error: error.message
            };
        }
    }
    processResult(result, name) {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        else {
            this.logger.error(`Health check failed: ${name}`, { error: result.reason });
            return {
                status: 'fail',
                timestamp: new Date().toISOString(),
                error: result.reason?.message || 'Health check failed'
            };
        }
    }
    determineOverallStatus(checks) {
        const statuses = Object.values(checks).map(check => check.status);
        if (statuses.includes('fail')) {
            return 'unhealthy';
        }
        else if (statuses.includes('warn')) {
            return 'degraded';
        }
        else {
            return 'healthy';
        }
    }
    async isAlive() {
        try {
            return process.uptime() > 0;
        }
        catch {
            return false;
        }
    }
    async isReady() {
        try {
            const health = await this.performHealthCheck();
            return health.status === 'healthy' || health.status === 'degraded';
        }
        catch {
            return false;
        }
    }
};
HealthCheckService = __decorate([
    singleton(),
    __metadata("design:paramtypes", [ResponseCacheService])
], HealthCheckService);
export { HealthCheckService };
//# sourceMappingURL=health-check.js.map