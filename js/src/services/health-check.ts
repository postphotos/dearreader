import { singleton } from 'tsyringe';
import { Logger } from '../shared/logger.js';
import { config } from '../shared/config-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ResponseCacheService } from './cache.js';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: Record<string, HealthCheck>;
}

export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  timestamp: string;
  responseTime?: number;
  details?: any;
  error?: string;
}

@singleton()
export class HealthCheckService {
  private logger = new Logger('HealthCheck');
  private startTime = Date.now();

  constructor(
    private cacheService: ResponseCacheService
  ) {}

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: Record<string, HealthCheck> = {};

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

    const health: HealthStatus = {
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
  private async checkMemoryUsage(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memUsage.rss / 1024 / 1024);

      const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
      let status: 'pass' | 'warn' | 'fail' = 'pass';

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

    } catch (error: any) {
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
  private async checkStorageHealth(): Promise<HealthCheck> {
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

    } catch (error: any) {
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
  private async checkCacheHealth(): Promise<HealthCheck> {
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

    } catch (error: any) {
      return {
        status: 'fail',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }

  private async checkConfigHealth(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      const configPath = path.join(process.cwd(), 'config.yaml');
      let configExists = false;
      
      try {
        await fs.access(configPath);
        configExists = true;
      } catch {
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

    } catch (error: any) {
      return {
        status: 'fail',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }

  private async checkSystemResources(): Promise<HealthCheck> {
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

    } catch (error: any) {
      return {
        status: 'fail',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }

  private processResult(result: PromiseSettledResult<HealthCheck>, name: string): HealthCheck {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      this.logger.error(`Health check failed: ${name}`, { error: result.reason });
      return {
        status: 'fail',
        timestamp: new Date().toISOString(),
        error: result.reason?.message || 'Health check failed'
      };
    }
  }

  private determineOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('fail')) {
      return 'unhealthy';
    } else if (statuses.includes('warn')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  async isAlive(): Promise<boolean> {
    try {
      return process.uptime() > 0;
    } catch {
      return false;
    }
  }

  async isReady(): Promise<boolean> {
    try {
      const health = await this.performHealthCheck();
      return health.status === 'healthy' || health.status === 'degraded';
    } catch {
      return false;
    }
  }
}
