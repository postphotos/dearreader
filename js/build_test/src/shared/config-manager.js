
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

import Joi from "joi";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { Logger } from "./logger.js";
import { fileURLToPath } from "url";
const logger = new Logger("ConfigManager");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configSchema = Joi.object({
  url: Joi.string().uri().default("http://localhost:3001"),
  base_path: Joi.object({
    enabled: Joi.boolean().default(true),
    path: Joi.string().default("/dearreader/")
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
    max_pages: Joi.number().min(1).max(1e3).default(100)
  }).default(),
  domain: Joi.object({
    allow_all_tlds: Joi.boolean().default(false)
  }).default(),
  storage: Joi.object({
    local_directory: Joi.string().default("./storage"),
    max_file_age_days: Joi.number().min(1).default(7)
  }).default(),
  development: Joi.object({
    debug: Joi.boolean().default(false),
    cors_enabled: Joi.boolean().default(true)
  }).default(),
  performance: Joi.object({
    max_concurrent_pages: Joi.number().min(1).max(100).default(10),
    page_idle_timeout: Joi.number().min(1e3).default(6e4),
    health_check_interval: Joi.number().min(1e3).default(3e4),
    request_timeout: Joi.number().min(1e3).default(1e4),
    max_requests_per_page: Joi.number().min(10).default(1e3),
    max_rps: Joi.number().min(1).default(60),
    max_domains_per_page: Joi.number().min(1).default(200)
  }).default(),
  queue: Joi.object({
    max_concurrent: Joi.number().min(1).max(50).default(3),
    max_retries: Joi.number().min(0).default(3),
    retry_delay: Joi.number().min(100).default(5e3),
    job_timeout: Joi.number().min(1e3).default(6e4),
    max_connections: Joi.number().min(1).default(3)
  }).default(),
  browser: Joi.object({
    viewport_width: Joi.number().min(100).default(1024),
    viewport_height: Joi.number().min(100).default(1024),
    stealth_mode: Joi.boolean().default(true),
    navigation_timeout: Joi.number().min(1e3).default(3e4),
    wait_for_network_idle: Joi.boolean().default(true)
  }).default(),
  cache: Joi.object({
    robots_cache_timeout: Joi.number().min(1e3).default(864e5),
    enable_response_cache: Joi.boolean().default(false),
    cache_size_limit: Joi.number().min(10).default(1e3)
  }).default(),
  content: Joi.object({
    enable_readability: Joi.boolean().default(true),
    remove_selectors: Joi.string().default(""),
    target_selectors: Joi.string().default(""),
    extract_images: Joi.boolean().default(true),
    extract_links: Joi.boolean().default(true),
    max_content_length: Joi.number().min(1e3).default(1e6),
    exclude_file_types: Joi.string().default(".xml, .rss, .atom, .json, .css, .js"),
    exclude_url_patterns: Joi.string().default("")
  }).default(),
  environment: Joi.object({
    max_workers: Joi.number().min(1).default(4),
    single_process_dev: Joi.boolean().default(true)
  }).default(),
  ai_enabled: Joi.boolean().default(true),
  ai_providers: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      api_key: Joi.string().default(""),
      base_url: Joi.string().uri().default(""),
      model: Joi.string().default(""),
      temperature: Joi.number().min(0).max(2).default(0.2),
      parsing_prompt: Joi.string().default(""),
      prompt_options: Joi.object({
        max_tokens: Joi.number().min(1).default(2048),
        top_p: Joi.number().min(0).max(1).default(1),
        frequency_penalty: Joi.number().min(-2).max(2).default(0),
        presence_penalty: Joi.number().min(-2).max(2).default(0)
      }).default(),
      request_timeout_ms: Joi.number().min(1e3).default(3e4),
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
    http_proxy: Joi.string().default(""),
    https_proxy: Joi.string().default(""),
    socks_proxy: Joi.string().default("")
  }).default(),
  headers: Joi.object({
    custom_headers: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
    cors_bypass_headers: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
    robots_bypass_headers: Joi.object().pattern(Joi.string(), Joi.string()).default({})
  }).default()
});
class ConfigManager {
  constructor() {
    this.watcher = null;
    this.onConfigChangeCallbacks = [];
    this.configPath = path.resolve(__dirname, "..", "..", "..", "config.yaml");
    this.config = this.loadAndValidateConfig();
    this.setupFileWatcher();
  }
  static getInstance() {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  getConfig() {
    return this.config;
  }
  getConfigPath() {
    return this.configPath;
  }
  loadAndValidateConfig() {
    try {
      let rawConfig = {};
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, "utf8");
        rawConfig = yaml.load(configContent) || {};
        logger.info(`Loaded configuration from ${this.configPath}`);
      } else {
        logger.warn(`No config.yaml found at ${this.configPath}, using defaults`);
      }
      this.applyEnvironmentOverrides(rawConfig);
      const { error, value } = configSchema.validate(rawConfig, {
        allowUnknown: true,
        abortEarly: false
      });
      if (error) {
        logger.error("Configuration validation failed:", error.details);
        throw new Error(`Configuration validation failed: ${error.message}`);
      }
      logger.info("Configuration loaded and validated successfully");
      return value;
    } catch (error) {
      logger.error("Failed to load configuration:", error);
      throw error;
    }
  }
  setupFileWatcher() {
    try {
      this.watcher = fs.watch(this.configPath, { persistent: false }, (eventType) => {
        if (eventType === "change") {
          logger.info("Config file changed, reloading...");
          try {
            const newConfig = this.loadAndValidateConfig();
            this.config = newConfig;
            this.onConfigChangeCallbacks.forEach((callback) => {
              try {
                callback(newConfig);
              } catch (error) {
                logger.error("Error in config change callback:", error);
              }
            });
            logger.info("Configuration hot-reloaded successfully");
          } catch (error) {
            logger.error("Failed to reload configuration:", error);
          }
        }
      });
      logger.info("Config file watcher started");
    } catch (error) {
      logger.warn("Failed to setup config file watcher:", error);
    }
  }
  onConfigChange(callback) {
    this.onConfigChangeCallbacks.push(callback);
  }
  reload() {
    try {
      this.config = this.loadAndValidateConfig();
      logger.info("Configuration reloaded successfully");
    } catch (error) {
      logger.error("Failed to reload configuration:", error);
      throw error;
    }
  }
  destroy() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info("Config file watcher stopped");
    }
  }
  applyEnvironmentOverrides(config2) {
    const envMappings = {
      "RESPECT_ROBOTS_TXT": "robots.respect_robots_txt",
      "ENABLE_PDF_PARSING": "pdf.enable_parsing",
      "ALLOW_ALL_TLDS": "domain.allow_all_tlds",
      "DEBUG_MODE": "development.debug",
      "MAX_CONCURRENT": "queue.max_concurrent",
      "STORAGE_DIR": "storage.local_directory"
    };
    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const envValue = process.env[envVar];
      if (envValue !== void 0) {
        this.setNestedProperty(config2, configPath, this.parseEnvValue(envValue));
        logger.info(`Applied environment override: ${envVar} -> ${configPath}`);
      }
    }
  }
  parseEnvValue(value) {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
    const num = Number(value);
    if (!isNaN(num)) return num;
    return value;
  }
  setNestedProperty(obj, path2, value) {
    const keys = path2.split(".");
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
const config = ConfigManager.getInstance().getConfig();
var config_manager_default = ConfigManager;
export {
  ConfigManager,
  config,
  config_manager_default as default
};
//# sourceMappingURL=config-manager.js.map
