import Joi from 'joi';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from './logger.js';
import { fileURLToPath } from 'url';

const logger = new Logger('ConfigManager');

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    exclude_file_types: string;
    exclude_url_patterns: string;
  };
  environment: {
    max_workers: number;
    single_process_dev: boolean;
  };
  ai_enabled: boolean;
  ai_providers: {
    [key: string]: {
      api_key: string;
      base_url: string;
      model: string;
      temperature: number;
      parsing_prompt: string;
      prompt_options: {
        max_tokens: number;
        top_p: number;
        frequency_penalty: number;
        presence_penalty: number;
      };
      request_timeout_ms: number;
      max_retries: number;
    };
  };
  ai_tasks: {
    [key: string]: string;
  };
  concurrency: {
    max_api_concurrency: number;
    default_client_concurrency: number;
    max_queue_length_per_client: number;
  };
  proxy: {
    http_proxy: string;
    https_proxy: string;
    socks_proxy: string;
  };
  headers: {
    custom_headers: { [key: string]: string };
    cors_bypass_headers: { [key: string]: string };
    robots_bypass_headers: { [key: string]: string };
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
    max_content_length: Joi.number().min(1000).default(1000000),
    exclude_file_types: Joi.string().default('.xml, .rss, .atom, .json, .css, .js'),
    exclude_url_patterns: Joi.string().default('')
  }).default(),
  environment: Joi.object({
    max_workers: Joi.number().min(1).default(4),
    single_process_dev: Joi.boolean().default(true)
  }).default(),
  ai_enabled: Joi.boolean().default(true),
  ai_providers: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      api_key: Joi.string().default(''),
      base_url: Joi.string().uri().default(''),
      model: Joi.string().default(''),
      temperature: Joi.number().min(0).max(2).default(0.2),
      parsing_prompt: Joi.string().default(''),
      prompt_options: Joi.object({
        max_tokens: Joi.number().min(1).default(2048),
        top_p: Joi.number().min(0).max(1).default(1.0),
        frequency_penalty: Joi.number().min(-2).max(2).default(0.0),
        presence_penalty: Joi.number().min(-2).max(2).default(0.0)
      }).default(),
      request_timeout_ms: Joi.number().min(1000).default(30000),
      max_retries: Joi.number().min(0).default(2)
    })
  ).default({}),
  ai_tasks: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
  concurrency: Joi.object({
    max_api_concurrency: Joi.number().min(1).default(50),
    default_client_concurrency: Joi.number().min(1).default(5),
    max_queue_length_per_client: Joi.number().min(1).default(20)
  }).default(),
  proxy: Joi.object({
    http_proxy: Joi.string().default(''),
    https_proxy: Joi.string().default(''),
    socks_proxy: Joi.string().default('')
  }).default(),
  headers: Joi.object({
    custom_headers: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
    cors_bypass_headers: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
    robots_bypass_headers: Joi.object().pattern(Joi.string(), Joi.string()).default({})
  }).default()
});

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private configPath: string;
  private watcher: fs.FSWatcher | null = null;
  private onConfigChangeCallbacks: Array<(config: AppConfig) => void> = [];

  private constructor() {
    // Look for config in project root (parent of js directory)
    this.configPath = path.resolve(__dirname, '..', '..', '..', 'config.yaml');
    this.config = this.loadAndValidateConfig();
    this.setupFileWatcher();
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

  public getConfigPath(): string {
    return this.configPath;
  }

  private loadAndValidateConfig(): AppConfig {
    try {
      let rawConfig: any = {};

      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf8');
        rawConfig = yaml.load(configContent) || {};
        logger.info(`Loaded configuration from ${this.configPath}`);
      } else {
        logger.warn(`No config.yaml found at ${this.configPath}, using defaults`);
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

  private setupFileWatcher(): void {
    try {
      // Watch the config file for changes
      this.watcher = fs.watch(this.configPath, { persistent: false }, (eventType) => {
        if (eventType === 'change') {
          logger.info('Config file changed, reloading...');
          try {
            const newConfig = this.loadAndValidateConfig();
            this.config = newConfig;

            // Notify all registered callbacks
            this.onConfigChangeCallbacks.forEach(callback => {
              try {
                callback(newConfig);
              } catch (error) {
                logger.error('Error in config change callback:', error);
              }
            });

            logger.info('Configuration hot-reloaded successfully');
          } catch (error) {
            logger.error('Failed to reload configuration:', error);
          }
        }
      });

      logger.info('Config file watcher started');
    } catch (error) {
      logger.warn('Failed to setup config file watcher:', error);
    }
  }

  public onConfigChange(callback: (config: AppConfig) => void): void {
    this.onConfigChangeCallbacks.push(callback);
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

  public destroy(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info('Config file watcher stopped');
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
}

// Export singleton instance
export const config = ConfigManager.getInstance().getConfig();
export default ConfigManager;
