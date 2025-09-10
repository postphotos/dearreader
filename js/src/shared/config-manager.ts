import Joi from 'joi';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from './logger.js';

const logger = new Logger('ConfigManager');

export interface AppConfig {
  url: string;
  base_path: {
    enabled: boolean;
    path: string;
  };
  robots: {
    respect_robots_txt: boolean;
  };
  pdf: {
    enable_parsing: boolean;
    max_file_size_mb: number;
    processing_timeout_seconds: number;
    enable_ocr: boolean;
    extract_metadata: boolean;
    max_pages: number;
  };
  domain: {
    allow_all_tlds: boolean;
  };
  storage: {
    local_directory: string;
    max_file_age_days: number;
  };
  development: {
    debug: boolean;
    cors_enabled: boolean;
  };
  performance: {
    max_concurrent_pages: number;
    page_idle_timeout: number;
    health_check_interval: number;
    request_timeout: number;
    max_requests_per_page: number;
    max_rps: number;
    max_domains_per_page: number;
  };
  queue: {
    max_concurrent: number;
    max_retries: number;
    retry_delay: number;
    job_timeout: number;
    max_connections: number;
  };
  browser: {
    viewport_width: number;
    viewport_height: number;
    stealth_mode: boolean;
    navigation_timeout: number;
    wait_for_network_idle: boolean;
  };
  cache: {
    robots_cache_timeout: number;
    enable_response_cache: boolean;
    cache_size_limit: number;
  };
  content: {
    enable_readability: boolean;
    remove_selectors: string;
    target_selectors: string;
    extract_images: boolean;
    extract_links: boolean;
    max_content_length: number;
  };
}

const configSchema = Joi.object<AppConfig>({
  url: Joi.string().uri().default('http://localhost:3001'),
  base_path: Joi.object({
    enabled: Joi.boolean().default(true),
    path: Joi.string().default('/dearreader/')
  }).default(),
  robots: Joi.object({
    respect_robots_txt: Joi.boolean().default(true)
  }).default(),
  pdf: Joi.object({
    enable_parsing: Joi.boolean().default(true),
    max_file_size_mb: Joi.number().min(1).max(500).default(50),
    processing_timeout_seconds: Joi.number().min(5).max(300).default(30),
    enable_ocr: Joi.boolean().default(false),
    extract_metadata: Joi.boolean().default(true),
    max_pages: Joi.number().min(1).max(1000).default(100)
  }).default(),
  domain: Joi.object({
    allow_all_tlds: Joi.boolean().default(false)
  }).default(),
  storage: Joi.object({
    local_directory: Joi.string().default('./storage'),
    max_file_age_days: Joi.number().min(1).default(7)
  }).default(),
  development: Joi.object({
    debug: Joi.boolean().default(false),
    cors_enabled: Joi.boolean().default(true)
  }).default(),
  performance: Joi.object({
    max_concurrent_pages: Joi.number().min(1).max(100).default(10),
    page_idle_timeout: Joi.number().min(1000).default(60000),
    health_check_interval: Joi.number().min(1000).default(30000),
    request_timeout: Joi.number().min(1000).default(10000),
    max_requests_per_page: Joi.number().min(10).default(1000),
    max_rps: Joi.number().min(1).default(60),
    max_domains_per_page: Joi.number().min(1).default(200)
  }).default(),
  queue: Joi.object({
    max_concurrent: Joi.number().min(1).max(50).default(3),
    max_retries: Joi.number().min(0).default(3),
    retry_delay: Joi.number().min(100).default(5000),
    job_timeout: Joi.number().min(1000).default(60000),
    max_connections: Joi.number().min(1).default(3)
  }).default(),
  browser: Joi.object({
    viewport_width: Joi.number().min(100).default(1024),
    viewport_height: Joi.number().min(100).default(1024),
    stealth_mode: Joi.boolean().default(true),
    navigation_timeout: Joi.number().min(1000).default(30000),
    wait_for_network_idle: Joi.boolean().default(true)
  }).default(),
  cache: Joi.object({
    robots_cache_timeout: Joi.number().min(1000).default(86400000),
    enable_response_cache: Joi.boolean().default(false),
    cache_size_limit: Joi.number().min(10).default(1000)
  }).default(),
  content: Joi.object({
    enable_readability: Joi.boolean().default(true),
    remove_selectors: Joi.string().default(''),
    target_selectors: Joi.string().default(''),
    extract_images: Joi.boolean().default(true),
    extract_links: Joi.boolean().default(true),
    max_content_length: Joi.number().min(1000).default(1000000)
  }).default()
});

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadAndValidateConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  private loadAndValidateConfig(): AppConfig {
    try {
      // Load from file
      const configPath = path.join(process.cwd(), 'config.yaml');
      let rawConfig: any = {};

      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        rawConfig = yaml.load(configContent) || {};
        logger.info('Loaded configuration from config.yaml');
      } else {
        logger.warn('No config.yaml found, using defaults');
      }

      // Apply environment variable overrides
      this.applyEnvironmentOverrides(rawConfig);

      // Validate and apply defaults
      const { error, value } = configSchema.validate(rawConfig, {
        allowUnknown: true,
        abortEarly: false
      });

      if (error) {
        logger.error('Configuration validation failed:', error.details);
        throw new Error(`Configuration validation failed: ${error.message}`);
      }

      logger.info('Configuration loaded and validated successfully');
      return value;

    } catch (error) {
      logger.error('Failed to load configuration:', error);
      throw error;
    }
  }

  private applyEnvironmentOverrides(config: any): void {
    // Environment variable overrides
    const envMappings = {
      'RESPECT_ROBOTS_TXT': 'robots.respect_robots_txt',
      'ENABLE_PDF_PARSING': 'pdf.enable_parsing',
      'ALLOW_ALL_TLDS': 'domain.allow_all_tlds',
      'DEBUG_MODE': 'development.debug',
      'MAX_CONCURRENT': 'queue.max_concurrent',
      'STORAGE_DIR': 'storage.local_directory'
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const envValue = process.env[envVar];
      if (envValue !== undefined) {
        this.setNestedProperty(config, configPath, this.parseEnvValue(envValue));
        logger.info(`Applied environment override: ${envVar} -> ${configPath}`);
      }
    }
  }

  private parseEnvValue(value: string): any {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    const num = Number(value);
    if (!isNaN(num)) return num;
    return value;
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  public reload(): void {
    try {
      this.config = this.loadAndValidateConfig();
      logger.info('Configuration reloaded successfully');
    } catch (error) {
      logger.error('Failed to reload configuration:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance().getConfig();
export default ConfigManager;
