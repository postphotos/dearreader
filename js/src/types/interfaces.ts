// Core type definitions for DearReader application
// This file centralizes all type definitions to improve type safety

export interface ConfigurationSchema {
  base_path?: {
    enabled?: boolean;
  };
  queue?: {
    max_concurrent?: number;
    max_retries?: number;
    retry_delay?: number;
    job_timeout?: number;
  };
  pdf?: {
    enable_parsing?: boolean;
    max_file_size_mb?: number;
    processing_timeout_seconds?: number;
    enable_ocr?: boolean;
    extract_metadata?: boolean;
    max_pages?: number;
  };
  performance?: {
    max_concurrent_pages?: number;
    page_idle_timeout?: number;
    health_check_interval?: number;
    request_timeout?: number;
    max_requests_per_page?: number;
    max_rps?: number;
    max_domains_per_page?: number;
  };
  robots?: {
    respect_robots_txt?: boolean;
  };
  domain?: {
    allow_all_tlds?: boolean;
  };
  browser?: {
    navigation_timeout?: number;
    viewport_width?: number;
    viewport_height?: number;
    stealth_mode?: boolean;
    wait_for_network_idle?: boolean;
  };
  cache?: {
    robots_cache_timeout?: number;
    enable_response_cache?: boolean;
    cache_size_limit?: number;
  };
  content?: {
    enable_readability?: boolean;
    remove_selectors?: string;
    target_selectors?: string;
    extract_images?: boolean;
    extract_links?: boolean;
    max_content_length?: number;
  };
  storage?: {
    local_directory?: string;
    max_file_age_days?: number;
  };
  development?: {
    debug?: boolean;
    cors_enabled?: boolean;
  };
  [key: string]: unknown; // Allow additional config options
}

export interface CrawlerConfiguration extends ConfigurationSchema {
  cacheRetentionMs?: number;
  cacheValidMs?: number;
  urlValidMs?: number;
  abuseBlockMs?: number;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  lang?: string;
  'og:title'?: string;
  'og:description'?: string;
  'og:type'?: string;
  'og:url'?: string;
  'og:site_name'?: string;
  'article:author'?: string;
  'article:published_time'?: string;
  viewport?: string;
  [key: string]: string | undefined;
}

export interface ParsedContent {
  title?: string;
  content?: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  publishedTime?: string;
  lang?: string;
}

export interface ImageData {
  src: string;
  alt?: string;
}

export interface ImgBrief {
  src: string;
  alt?: string;
}

export interface FormattedPage {
  title?: string;
  description?: string;
  url?: string;
  content?: string;
  publishedTime?: string;
  html?: string;
  text?: string;
  screenshotUrl?: string;
  screenshot?: Buffer;
  pageshotUrl?: string;
  pageshot?: Buffer;
  links?: { [k: string]: string; };
  images?: { [k: string]: string; };
  toString: () => string;
}

export interface CacheEntry {
  data: FormattedPage;
  timestamp: number;
  ttl: number;
  contentType?: string;
  hasPrivacyData?: boolean;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'pass' | 'warn' | 'fail';
      message: string;
      duration: number;
      value?: number | string;
    };
  };
  timestamp: string;
  uptime: number;
}

export interface ErrorContext {
  url?: string;
  operation?: string;
  userId?: string;
  timestamp?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface TurndownOptions {
  noRules?: boolean | string;
  url?: string | URL;
  imgDataUrlToObjectUrl?: boolean;
}

export interface RequestHeaders {
  accept?: string;
  'x-return-format'?: string;
  'x-respond-with'?: string;
  'x-set-cookie'?: string | string[];
  host?: string;
  'x-forwarded-proto'?: string;
  'X-Forwarded-Proto'?: string;
  'Host'?: string;
  [key: string]: string | string[] | undefined;
}

export interface CookieData {
  name: string;
  value: string;
  url: string;
}

export interface AbuseEvent {
  url: URL;
  reason: string;
  sn: number;
}

export interface DomainBlockadeData {
  domain: string;
  triggerReason: string;
  triggerUrl: string;
  createdAt: Date;
  expireAt: Date;
}

export interface CacheStatistics {
  hits: number;
  misses: number;
  keys: number;
  ksize: number;
  vsize: number;
}

export interface SystemResourceInfo {
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  uptime: number;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface TurndownNode {
  tagName: string;
  nodeName: string;
  previousSibling?: TurndownNode;
  nextSibling?: TurndownNode;
  parentNode?: TurndownNode;
  getAttribute: (name: string) => string | null;
}

export interface JsdomInferredData {
  links?: { [text: string]: string };
  imgs?: ImgBrief[];
}

export interface ExtendedSnapshot {
  links?: { [text: string]: string };
  imgs?: ImgBrief[];
}

export interface PuppeteerResourceStats {
  openPages: number;
  totalPagesCreated: number;
  memoryUsage: number;
  avgPageAge: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure?: Date;
  state: 'closed' | 'open' | 'half-open';
}

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface LoggerContext {
  [key: string]: unknown;
}

export interface LoggerTimer {
  end: () => void;
}

// Re-export core types that are used throughout the application
export type { ExtraScrappingOptions } from '../cloud-functions/crawler.js';
