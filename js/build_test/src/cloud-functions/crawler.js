
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
import {
  marshalErrorLike,
  RPCHost,
  HashManager,
  AssertionFailureError,
  Defer
} from "civkit";
import { singleton } from "tsyringe";
import { Logger } from "../shared/index.js";
import _ from "lodash";
import TurndownService from "turndown";
import * as turndownPluginGfm from "turndown-plugin-gfm";
import { cleanAttribute } from "../utils/misc.js";
import { randomUUID } from "crypto";
import * as yaml from "js-yaml";
import { CrawlerOptions } from "../dto/scraping-options.js";
import { DomainBlockade } from "../db/domain-blockade.js";
import * as fs from "fs";
import * as path from "path";
console.log("Initializing CrawlerHost");
function safeNormalizeUrl(input, base) {
  try {
    if (input instanceof URL) return input;
    if (base) return new URL(input, base);
    return new URL(input);
  } catch (_2) {
    const defaultBase = base ? String(base) : "http://localhost:3000";
    return new URL(input.toString(), defaultBase);
  }
}
function sendResponse(res, data, meta) {
  if (meta.code) {
    res.status(meta.code);
  }
  if (meta.contentType) {
    res.type(meta.contentType);
  }
  if (meta.headers) {
    for (const [key, value] of Object.entries(meta.headers)) {
      if (value !== void 0) {
        res.setHeader(key, value);
      }
    }
  }
  res.send(data);
  return data;
}
let CrawlerHost = class extends RPCHost {
  constructor(puppeteerControl, jsdomControl, pdfExtractor, robotsChecker, firebaseObjectStorage, threadLocal) {
    super(...arguments);
    this.puppeteerControl = puppeteerControl;
    this.jsdomControl = jsdomControl;
    this.pdfExtractor = pdfExtractor;
    this.robotsChecker = robotsChecker;
    this.firebaseObjectStorage = firebaseObjectStorage;
    this.threadLocal = threadLocal;
    this.logger = new Logger("CrawlerHost");
    this.turnDownPlugins = [turndownPluginGfm.tables];
    this.cacheRetentionMs = 1e3 * 3600 * 24 * 7;
    this.cacheValidMs = 1e3 * 3600;
    this.urlValidMs = 1e3 * 3600 * 4;
    this.abuseBlockMs = 1e3 * 3600;
    this.config = {};
    console.log("CrawlerHost constructor called");
    this.loadConfig();
    console.log("Initializing CrawlerHost with dependencies:", {
      puppeteerControl: !!puppeteerControl,
      jsdomControl: !!jsdomControl,
      firebaseObjectStorage: !!firebaseObjectStorage,
      threadLocal: !!threadLocal,
      pdfExtractor: !!pdfExtractor,
      robotsChecker: !!robotsChecker
    });
    puppeteerControl.on("crawled", async (snapshot, options) => {
      console.log("Crawled event received", { url: options.url.toString() });
      if (!snapshot.title?.trim() && !snapshot.pdfs?.length) {
        console.log("Skipping snapshot due to empty title and no PDFs");
        return;
      }
      if (options.cookies?.length) {
        console.log("Skipping caching due to cookies");
        return;
      }
    });
    if (!puppeteerControl.crawl) {
      puppeteerControl.crawl = async function(url, options) {
        console.log("PuppeteerControl crawl method called:", { url: url.toString(), options });
        const iterator = this.scrape(url, options);
        for await (const snapshot of iterator) {
          if (snapshot) {
            return snapshot;
          }
        }
        return void 0;
      };
    }
    puppeteerControl.on("abuse", async (abuseEvent) => {
      console.log("Abuse event received", abuseEvent);
      this.logger.warn(`Abuse detected on ${abuseEvent.url}, blocking ${abuseEvent.url.hostname}`, { reason: abuseEvent.reason, sn: abuseEvent.sn });
      const blockade = new DomainBlockade();
      blockade.domain = abuseEvent.url.hostname.toLowerCase();
      blockade.triggerReason = `${abuseEvent.reason}`;
      blockade.triggerUrl = abuseEvent.url.toString();
      blockade.createdAt = /* @__PURE__ */ new Date();
      blockade.expireAt = new Date(Date.now() + this.abuseBlockMs);
      await blockade.save().catch(() => {
        console.error("Failed to save domain blockade");
        this.logger.warn(`Failed to save domain blockade for ${abuseEvent.url.hostname}`);
      });
    });
  }
  loadConfig() {
    try {
      const configPath = path.join(process.cwd(), "config.yaml");
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, "utf8");
        const loadedConfig = yaml.load(configContent);
        this.config = loadedConfig || {};
        console.log("Loaded configuration from config.yaml:", this.config);
      } else {
        console.log("No config.yaml found, using defaults");
        this.config = {};
      }
      this.applyEnvironmentOverrides();
    } catch (error) {
      console.error("Error loading config.yaml:", error);
      this.config = {};
      this.applyEnvironmentOverrides();
    }
  }
  applyEnvironmentOverrides() {
    if (process.env.RESPECT_ROBOTS_TXT) {
      this.config.robots = this.config.robots || {};
      this.config.robots.respect_robots_txt = process.env.RESPECT_ROBOTS_TXT === "true";
    }
    if (process.env.ENABLE_PDF_PARSING) {
      this.config.pdf = this.config.pdf || {};
      this.config.pdf.enable_parsing = process.env.ENABLE_PDF_PARSING === "true";
    }
    if (process.env.ALLOW_ALL_TLDS) {
      this.config.domain = this.config.domain || {};
      this.config.domain.allow_all_tlds = process.env.ALLOW_ALL_TLDS === "true";
    }
    if (process.env.DEBUG_MODE) {
      this.config.development = this.config.development || {};
      this.config.development.debug = process.env.DEBUG_MODE === "true";
    }
    this.config.robots = this.config.robots || { respect_robots_txt: true };
    this.config.pdf = this.config.pdf || {
      enable_parsing: true,
      max_file_size_mb: 50,
      processing_timeout_seconds: 30,
      enable_ocr: false,
      extract_metadata: true,
      max_pages: 100
    };
    this.config.domain = this.config.domain || { allow_all_tlds: false };
    this.config.storage = this.config.storage || { local_directory: "./storage", max_file_age_days: 7 };
    this.config.development = this.config.development || { debug: false, cors_enabled: true };
    this.config.performance = this.config.performance || {
      max_concurrent_pages: 10,
      page_idle_timeout: 6e4,
      health_check_interval: 3e4,
      request_timeout: 1e4,
      max_requests_per_page: 1e3,
      max_rps: 60,
      max_domains_per_page: 200
    };
    this.config.queue = this.config.queue || {
      max_concurrent: 3,
      max_retries: 3,
      retry_delay: 5e3,
      job_timeout: 6e4
    };
    this.config.browser = this.config.browser || {
      viewport_width: 1024,
      viewport_height: 1024,
      stealth_mode: true,
      navigation_timeout: 3e4,
      wait_for_network_idle: true
    };
    this.config.cache = this.config.cache || {
      robots_cache_timeout: 864e5,
      enable_response_cache: false,
      cache_size_limit: 1e3
    };
    this.config.content = this.config.content || {
      enable_readability: true,
      remove_selectors: "",
      target_selectors: "",
      extract_images: true,
      extract_links: true,
      max_content_length: 1e6
    };
  }
  async init() {
    console.log("Initializing CrawlerHost");
    await this.dependencyReady();
    this.emit("ready");
    console.log("CrawlerHost ready");
    console.log("CrawlerHost initialization complete");
  }
  markdownToHtml(markdown) {
    let html = markdown.replace(/^# (.*$)/gim, "<h1>$1</h1>").replace(/^## (.*$)/gim, "<h2>$1</h2>").replace(/^### (.*$)/gim, "<h3>$1</h3>").replace(/^#### (.*$)/gim, "<h4>$1</h4>").replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>").replace(/\*(.*)\*/gim, "<em>$1</em>").replace(/`([^`]+)`/gim, "<code>$1</code>").replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>').replace(/\n\n/gim, "</p><p>").replace(/\n/gim, "<br>");
    html = html.replace(/```bash\n([\s\S]*?)\n```/gim, '<pre><code class="language-bash">$1</code></pre>');
    html = html.replace(/```([\s\S]*?)```/gim, "<pre><code>$1</code></pre>");
    html = "<p>" + html + "</p>";
    html = html.replace(/<p><\/p>/gim, "");
    html = html.replace(/<p><h/gim, "<h");
    html = html.replace(/<\/h([1-6])><\/p>/gim, "</h$1>");
    html = html.replace(/<p><pre>/gim, "<pre>");
    html = html.replace(/<\/pre><\/p>/gim, "</pre>");
    return html;
  }
  getIndex(req) {
    console.log("Getting index");
    const protocol = req?.get("x-forwarded-proto") || req?.protocol || "http";
    const host = req?.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;
    const indexData = {
      title: "DearReader API - Local Web Content Extractor",
      description: "Convert any URL to LLM-friendly content",
      url: baseUrl,
      content: "",
      publishedTime: void 0,
      html: void 0,
      text: void 0,
      screenshotUrl: void 0,
      screenshot: void 0,
      pageshotUrl: void 0,
      pageshot: void 0,
      links: void 0,
      images: void 0,
      toString: function() {
        return `Title: DearReader API - Local Web Content Extractor

URL Source: ${this.url}

Markdown Content:
DearReader API - Local Web Content Extractor
===========================================

Welcome to your local DearReader API! Convert any URL to LLM-friendly content.

## \u{1F4DA} Try These Examples

### Basic Content Extraction
- [${baseUrl}/https://example.com](${baseUrl}/https://example.com)
- [${baseUrl}/https://news.ycombinator.com](${baseUrl}/https://news.ycombinator.com)
- [${baseUrl}/https://github.com/jina-ai/reader](${baseUrl}/https://github.com/jina-ai/reader)

### With Different Response Formats
- [JSON Format: ${baseUrl}/https://example.com (Accept: application/json)](${baseUrl}/https://example.com)
- [Markdown: ${baseUrl}/https://example.com (Accept: text/plain)](${baseUrl}/https://example.com)
- [HTML: ${baseUrl}/https://example.com (X-Respond-With: html)](${baseUrl}/https://example.com)
- [Text Only: ${baseUrl}/https://example.com (X-Respond-With: text)](${baseUrl}/https://example.com)

### Screenshots
- [Screenshot: ${baseUrl}/https://example.com (X-Respond-With: screenshot)](${baseUrl}/https://example.com)
- [Full Page: ${baseUrl}/https://example.com (X-Respond-With: pageshot)](${baseUrl}/https://example.com)

## \u{1F527} Usage

Simply append any URL to: \`${baseUrl}/YOUR_URL\`

Examples:
\`\`\`bash
# Get JSON response
curl -H "Accept: application/json" "${baseUrl}/https://example.com"

# Get markdown
curl "${baseUrl}/https://example.com"

# Get screenshot URL
curl -H "X-Respond-With: screenshot" "${baseUrl}/https://example.com"
\`\`\`

## \u{1F310} Response Formats
- **Default**: Clean markdown content
- **JSON**: Complete metadata with links, images, and content
- **HTML**: Cleaned HTML content
- **Text**: Plain text extraction
- **Screenshot/Pageshot**: URL to saved image

## \u{1F4CA} Queue Monitoring
- [Queue API: ${baseUrl}/queue](${baseUrl}/queue) - JSON queue statistics
- [Queue Monitor: ${baseUrl}/queue-ui](${baseUrl}/queue-ui) - Real-time queue dashboard

---
\u{1F4C1} Source Code: [GitHub Repository](https://github.com/postphotos/reader)`;
      }
    };
    console.log("Index object created:", indexData);
    return indexData;
  }
  getTurndown(options) {
    console.log("Getting Turndown service", options);
    const turnDownService = new TurndownService({
      codeBlockStyle: "fenced",
      preformattedCode: true
    });
    if (!options?.noRules) {
      console.log("Adding Turndown rules");
      turnDownService.addRule("remove-irrelevant", {
        filter: ["meta", "style", "script", "noscript", "link", "textarea", "select"],
        replacement: () => ""
      });
      turnDownService.addRule("truncate-svg", {
        filter: (node) => node.nodeName === "SVG",
        replacement: () => ""
      });
      turnDownService.addRule("title-as-h1", {
        filter: ["title"],
        replacement: (innerText) => `${innerText}
===============
`
      });
    }
    if (options?.imgDataUrlToObjectUrl) {
      console.log("Adding data-url-to-pseudo-object-url rule");
      turnDownService.addRule("data-url-to-pseudo-object-url", {
        filter: (node) => Boolean(node.tagName === "IMG" && node.getAttribute("src")?.startsWith("data:")),
        replacement: (_content, node) => {
          const element = node;
          const src = (element.getAttribute("src") || "").trim();
          const alt = cleanAttribute(element.getAttribute("alt")) || "";
          if (options.url) {
            const refUrl = new URL(options.url.toString());
            const mappedUrl = new URL(`blob:${refUrl.origin}/${CrawlerHost.md5Hasher.hash(src)}`);
            return `![${alt}](${mappedUrl})`;
          }
          return `![${alt}](blob:${CrawlerHost.md5Hasher.hash(src)})`;
        }
      });
    }
    turnDownService.addRule("improved-paragraph", {
      filter: "p",
      replacement: (innerText) => {
        const trimmed = innerText.trim();
        if (!trimmed) {
          return "";
        }
        return `${trimmed.replace(/\n{3,}/g, "\n\n")}

`;
      }
    });
    turnDownService.addRule("improved-inline-link", {
      filter: function(node, options2) {
        return Boolean(
          options2.linkStyle === "inlined" && node.nodeName === "A" && node.getAttribute("href")
        );
      },
      replacement: function(content, node) {
        const element = node;
        let href = element.getAttribute("href");
        if (href) href = href.replace(/([()])/g, "\\$1");
        let title = cleanAttribute(element.getAttribute("title"));
        if (title) title = ' "' + title.replace(/"/g, '\\"') + '"';
        const fixedContent = content.replace(/\s+/g, " ").trim();
        let fixedHref = href.replace(/\s+/g, "").trim();
        if (options?.url) {
          try {
            fixedHref = new URL(fixedHref, options.url).toString();
          } catch (_err) {
          }
        }
        return `[${fixedContent}](${fixedHref}${title || ""})`;
      }
    });
    turnDownService.addRule("improved-code", {
      filter: function(node) {
        const element = node;
        let hasSiblings = element.previousSibling || element.nextSibling;
        let isCodeBlock = element.parentNode?.nodeName === "PRE" && !hasSiblings;
        return node.nodeName === "CODE" && !isCodeBlock;
      },
      replacement: function(inputContent) {
        if (!inputContent) return "";
        let content = inputContent;
        let delimiter = "`";
        const matches = content.match(/`+/gm) || [];
        while (matches.indexOf(delimiter) !== -1) delimiter = delimiter + "`";
        if (content.includes("\n")) {
          delimiter = "```";
        }
        let extraSpace = delimiter === "```" ? "\n" : /^`|^ .*?[^ ].* $|`$/.test(content) ? " " : "";
        return delimiter + extraSpace + content + (delimiter === "```" && !content.endsWith(extraSpace) ? extraSpace : "") + delimiter;
      }
    });
    console.log("Turndown service configured");
    return turnDownService;
  }
  getGeneralSnapshotMixins(snapshot) {
    console.log("Getting general snapshot mixins");
    let inferred;
    const mixin = {};
    if (this.threadLocal.get("withImagesSummary")) {
      console.log("Generating image summary");
      inferred ??= this.jsdomControl.inferSnapshot(snapshot);
      const imageSummary = {};
      const imageIdxTrack = /* @__PURE__ */ new Map();
      let imgIdx = 0;
      for (const img of inferred.imgs || []) {
        const imgSerial = ++imgIdx;
        const idxArr = imageIdxTrack.has(img.src) ? imageIdxTrack.get(img.src) : [];
        idxArr.push(imgSerial);
        imageIdxTrack.set(img.src, idxArr);
        imageSummary[img.src] = img.alt || "";
      }
      mixin.images = _(imageSummary).toPairs().map(
        ([url, alt], i) => {
          return [`Image ${(imageIdxTrack?.get(url) || [i + 1]).join(",")}${alt ? `: ${alt}` : ""}`, url];
        }
      ).fromPairs().value();
      console.log(`Generated image summary with ${Object.keys(mixin.images || {}).length} images`);
    }
    if (this.threadLocal.get("withLinksSummary")) {
      console.log("Generating link summary");
      inferred ??= this.jsdomControl.inferSnapshot(snapshot);
      mixin.links = _.invert(inferred.links || {});
      console.log(`Generated link summary with ${Object.keys(mixin.links || {}).length} links`);
    }
    return mixin;
  }
  async formatSnapshot(mode, snapshot, nominalUrl) {
    console.log("Formatting snapshot", { mode, url: nominalUrl?.toString() });
    if (mode === "screenshot") {
      if (snapshot.screenshot && !snapshot.screenshotUrl) {
        console.log("Saving screenshot");
        const fileName = `screenshot-${randomUUID()}.png`;
        await this.saveFileLocally(fileName, snapshot.screenshot);
        snapshot.screenshotUrl = `/instant-screenshots/${fileName}`;
        console.log("Screenshot saved and URL generated", { screenshotUrl: snapshot.screenshotUrl });
      }
      return {
        ...this.getGeneralSnapshotMixins(snapshot),
        screenshotUrl: snapshot.screenshotUrl,
        toString() {
          return this.screenshotUrl;
        }
      };
    }
    if (mode === "pageshot") {
      if (snapshot.pageshot && !snapshot.pageshotUrl) {
        console.log("Saving pageshot");
        const fileName = `pageshot-${randomUUID()}.png`;
        await this.saveFileLocally(fileName, snapshot.pageshot);
        snapshot.pageshotUrl = `/instant-screenshots/${fileName}`;
        console.log("Pageshot saved and URL generated", { pageshotUrl: snapshot.pageshotUrl });
      }
      return {
        ...this.getGeneralSnapshotMixins(snapshot),
        html: snapshot.html,
        pageshotUrl: snapshot.pageshotUrl,
        toString() {
          return this.pageshotUrl;
        }
      };
    }
    if (mode === "html") {
      console.log("Formatting as HTML");
      return {
        ...this.getGeneralSnapshotMixins(snapshot),
        html: snapshot.html,
        toString() {
          return this.html;
        }
      };
    }
    if (mode === "text") {
      console.log("Formatting as text");
      return {
        ...this.getGeneralSnapshotMixins(snapshot),
        text: snapshot.text,
        toString() {
          return this.text;
        }
      };
    }
    const imgDataUrlToObjectUrl = !Boolean(this.threadLocal.get("keepImgDataUrl"));
    let contentText = "";
    const imageSummary = {};
    const imageIdxTrack = /* @__PURE__ */ new Map();
    const isPdfMode = snapshot.pdfs && snapshot.pdfs.length > 0 && this.config.pdf?.enable_parsing;
    if (isPdfMode) {
      console.log("PDF mode detected and PDF processing is enabled");
      contentText = snapshot.parsed?.content || snapshot.text;
    } else if (snapshot.pdfs && snapshot.pdfs.length > 0 && !this.config.pdf?.enable_parsing) {
      console.log("PDF mode detected but PDF processing is disabled in config, skipping PDF content");
      contentText = snapshot.text;
    } else if (snapshot.maxElemDepth && snapshot.maxElemDepth > 256 || snapshot.elemCount && snapshot.elemCount > 7e4) {
      console.log("Degrading to text to protect the server");
      this.logger.warn("Degrading to text to protect the server", { url: snapshot.href });
      contentText = snapshot.text;
    } else {
      console.log("Processing HTML content");
      const jsDomElementOfHTML = this.jsdomControl.snippetToElement(snapshot.html, snapshot.href);
      let toBeTurnedToMd = jsDomElementOfHTML;
      let turnDownService = this.getTurndown({ url: snapshot.rebase || nominalUrl, imgDataUrlToObjectUrl });
      if (mode !== "markdown" && snapshot.parsed?.content) {
        console.log("Processing parsed content for non-markdown mode");
        const jsDomElementOfParsed = this.jsdomControl.snippetToElement(snapshot.parsed.content, snapshot.href);
        const par1 = this.jsdomControl.runTurndown(turnDownService, jsDomElementOfHTML);
        const par2 = this.jsdomControl.runTurndown(turnDownService, jsDomElementOfParsed);
        if (par2.length >= 0.3 * par1.length) {
          console.log("Readability seems to have done its job, adjusting turnDownService");
          turnDownService = this.getTurndown({ noRules: true, url: snapshot.rebase || nominalUrl, imgDataUrlToObjectUrl });
          toBeTurnedToMd = jsDomElementOfParsed;
        } else {
          console.log("Readability output not sufficient, using original HTML");
        }
      }
      for (const plugin of this.turnDownPlugins) {
        turnDownService.use(plugin);
      }
      const urlToAltMap = {};
      if (snapshot.imgs?.length && this.threadLocal.get("withGeneratedAlt")) {
        const tasks = _.uniqBy(snapshot.imgs, "src").map(async (x) => {
          const r = "ALT TEXT!!!";
          if (r && x.src) {
            urlToAltMap[x.src.trim()] = r;
          }
        });
        await Promise.all(tasks);
        let imgIdx = 0;
        turnDownService.addRule("img-generated-alt", {
          filter: "img",
          replacement: (_content, node) => {
            const element = node;
            let linkPreferredSrc = (element.getAttribute("src") || "").trim();
            if (!linkPreferredSrc || linkPreferredSrc.startsWith("data:")) {
              const dataSrc = (element.getAttribute("data-src") || "").trim();
              if (dataSrc && !dataSrc.startsWith("data:")) {
                linkPreferredSrc = dataSrc;
              }
            }
            let src;
            try {
              src = new URL(linkPreferredSrc, snapshot.rebase || nominalUrl).toString();
            } catch (_err) {
            }
            const alt = cleanAttribute(element.getAttribute("alt"));
            if (!src) {
              return "";
            }
            const mapped = urlToAltMap[src];
            const imgSerial = ++imgIdx;
            const idxArr = imageIdxTrack.has(src) ? imageIdxTrack.get(src) : [];
            idxArr.push(imgSerial);
            imageIdxTrack.set(src, idxArr);
            imageSummary[src] = mapped || alt;
            const effectiveAlt = `Image ${imgIdx}: ${mapped || alt}`;
            if (imgDataUrlToObjectUrl) {
              const mappedUrl = `blob:${nominalUrl?.origin || ""}/${CrawlerHost.md5Hasher.hash(src)}`;
              return `![${effectiveAlt}](${mappedUrl})`;
            }
            return `![${effectiveAlt}](${src})`;
          }
        });
      }
      if (toBeTurnedToMd) {
        try {
          contentText = this.jsdomControl.runTurndown(turnDownService, toBeTurnedToMd).trim();
        } catch (err) {
          this.logger.warn(`Turndown failed to run, retrying without plugins`, { err });
          const vanillaTurnDownService = this.getTurndown({ url: snapshot.rebase || nominalUrl, imgDataUrlToObjectUrl });
          try {
            contentText = this.jsdomControl.runTurndown(vanillaTurnDownService, toBeTurnedToMd).trim();
          } catch (err2) {
            this.logger.warn(`Turndown failed to run, giving up`, { err: err2 });
          }
        }
      }
      if ((!contentText || contentText.startsWith("<") && contentText.endsWith(">")) && toBeTurnedToMd !== jsDomElementOfHTML) {
        try {
          contentText = this.jsdomControl.runTurndown(turnDownService, jsDomElementOfHTML);
        } catch (err) {
          this.logger.warn(`Turndown failed to run on fallback, retrying without plugins`, { err });
          const vanillaTurnDownService = this.getTurndown({ url: snapshot.rebase || nominalUrl, imgDataUrlToObjectUrl });
          try {
            contentText = this.jsdomControl.runTurndown(vanillaTurnDownService, jsDomElementOfHTML);
          } catch (err2) {
            this.logger.warn(`Turndown fallback failed, giving up`, { err: err2 });
          }
        }
      }
      if (!contentText || contentText.startsWith("<") && contentText.endsWith(">")) {
        contentText = snapshot.text;
      }
    }
    const cleanText = (contentText || "").trim();
    const formatted = {
      title: (snapshot.parsed?.title || snapshot.title || "").trim(),
      url: nominalUrl?.toString() || snapshot.href?.trim(),
      content: cleanText,
      publishedTime: snapshot.parsed?.publishedTime || void 0,
      toString() {
        if (mode === "markdown") {
          return this.content;
        }
        const mixins = [];
        if (this.publishedTime) {
          mixins.push(`Published Time: ${this.publishedTime}`);
        }
        const suffixMixins = [];
        if (this.images) {
          const imageSummaryChunks = ["Images:"];
          for (const [k, v] of Object.entries(this.images)) {
            imageSummaryChunks.push(`- ![${k}](${v})`);
          }
          if (imageSummaryChunks.length === 1) {
            imageSummaryChunks.push("This page does not seem to contain any images.");
          }
          suffixMixins.push(imageSummaryChunks.join("\n"));
        }
        const linkSummaryChunks = ["Links/Buttons:"];
        if (this.links) {
          for (const [k, v] of Object.entries(this.links)) {
            linkSummaryChunks.push(`- [${k}](${v})`);
          }
        }
        if (linkSummaryChunks.length === 1) {
          linkSummaryChunks.push("This page does not seem to contain any buttons/links.");
        }
        suffixMixins.push(linkSummaryChunks.join("\n"));
        return `Title: ${this.title}

    URL Source: ${this.url}
    ${mixins.length ? `
${mixins.join("\n\n")}
` : ""}
    Markdown Content:
    ${this.content}
    ${suffixMixins.length ? `
${suffixMixins.join("\n\n")}
` : ""}`;
      }
    };
    if (this.threadLocal.get("withImagesSummary")) {
      formatted.images = _(imageSummary).toPairs().map(
        ([url, alt], i) => {
          return [`Image ${(imageIdxTrack?.get(url) || [i + 1]).join(",")}${alt ? `: ${alt}` : ""}`, url];
        }
      ).fromPairs().value();
    }
    const acceptHeader = this.threadLocal.get("accept") || "";
    const returnFormat = this.threadLocal.get("x-return-format");
    const wantsJson = acceptHeader.includes("application/json") || returnFormat === "json" || this.threadLocal.get("withLinksSummary");
    if (wantsJson) {
      formatted.links = this.jsdomControl.inferSnapshot(snapshot).links || {};
      if (!formatted.images) {
        formatted.images = _(imageSummary).toPairs().map(([url, alt], i) => {
          return [`Image ${(imageIdxTrack?.get(url) || [i + 1]).join(",")}${alt ? `: ${alt}` : ""}`, url];
        }).fromPairs().value();
      }
      formatted.content = snapshot.text || cleanText;
    }
    return formatted;
  }
  isValidTLD(hostname) {
    const parts = hostname.split(".");
    return parts.length > 1 && parts[parts.length - 1].length >= 2;
  }
  serveScreenshot(screenshotPath, res) {
    const relativePath = screenshotPath.replace(/^instant-screenshots\//, "");
    const fullPath = path.join("/app", "local-storage", "instant-screenshots", relativePath);
    console.log(`Attempting to serve screenshot from: ${fullPath}`);
    if (fs.existsSync(fullPath)) {
      return res.sendFile(fullPath);
    } else {
      console.log(`Screenshot not found: ${fullPath}`);
      return sendResponse(res, "Screenshot not found", { contentType: "text/plain", code: 404 });
    }
  }
  sendFormattedResponse(res, formatted, respondWith, snapshot) {
    const acceptHeader = this.threadLocal.get("accept") || "";
    const returnFormat = this.threadLocal.get("x-return-format") || "";
    const wantsJson = acceptHeader.includes("application/json") || returnFormat === "json";
    if (respondWith === "screenshot" && formatted.screenshotUrl) {
      return sendResponse(res, "", { code: 302, headers: { Location: formatted.screenshotUrl } });
    }
    if (respondWith === "pageshot" && formatted.pageshotUrl) {
      return sendResponse(res, "", { code: 302, headers: { Location: formatted.pageshotUrl } });
    }
    if (wantsJson) {
      const lang = snapshot?.parsed?.lang || "en";
      const description = snapshot?.parsed?.excerpt || formatted.title;
      const siteName = snapshot?.parsed?.siteName || "";
      const byline = snapshot?.parsed?.byline || "";
      const jsonResponse = {
        code: 200,
        status: 2e4,
        data: {
          title: formatted.title,
          description,
          url: formatted.url,
          content: formatted.content,
          links: formatted.links || {},
          images: formatted.images || {},
          metadata: {
            lang,
            description,
            "og:title": formatted.title,
            "og:description": description,
            "og:type": "website",
            "og:url": formatted.url,
            "og:site_name": siteName,
            "article:author": byline,
            "article:published_time": formatted.publishedTime || "",
            viewport: "width=device-width, initial-scale=1.0"
          },
          usage: {
            tokens: Math.ceil((formatted.content?.length || 0) / 4)
          }
        },
        meta: {
          usage: {
            tokens: Math.ceil((formatted.content?.length || 0) / 4)
          }
        }
      };
      return sendResponse(res, jsonResponse, { contentType: "application/json" });
    }
    let responseText;
    if (formatted && typeof formatted.toString === "function") {
      responseText = formatted.toString();
    } else {
      responseText = String(formatted);
    }
    return sendResponse(res, responseText, { contentType: "text/plain" });
  }
  getUrlDigest(urlToCrawl) {
    const normalizedURL = safeNormalizeUrl(urlToCrawl);
    if (!normalizedURL.hash.startsWith("#/")) {
      normalizedURL.hash = "";
    }
    return CrawlerHost.md5Hasher.hash(normalizedURL.toString());
  }
  async *scrap(urlToCrawl, crawlOpts, crawlerOpts) {
    this.logger.info(`Starting scrap for URL: ${urlToCrawl.toString()}`);
    console.log("Starting scrap for URL:", urlToCrawl.toString(), { crawlOpts, crawlerOpts });
    if (crawlerOpts?.html) {
      console.log("Using provided HTML");
      const fakeSnapshot = {
        href: urlToCrawl.toString(),
        html: crawlerOpts.html,
        title: "",
        text: ""
      };
      yield this.jsdomControl.narrowSnapshot(fakeSnapshot, crawlOpts);
      return;
    }
    const scrapIterator = this.puppeteerControl.scrape(urlToCrawl, crawlOpts);
    if (crawlOpts?.targetSelector || crawlOpts?.removeSelector || crawlOpts?.withIframe) {
      console.log("Using custom selectors or iframe narrowing");
      for await (const x of scrapIterator) {
        if (x) {
          yield this.jsdomControl.narrowSnapshot(x, crawlOpts);
        }
      }
    } else {
      console.log("Using default scraping method");
      yield* scrapIterator;
    }
  }
  async *scrapMany(urls, options, crawlerOpts) {
    const iterators = urls.map((url) => this.scrap(url, options, crawlerOpts));
    const results = Array(iterators.length).fill(void 0);
    let concluded = false;
    let nextDeferred = Defer();
    const handler = async (it, idx) => {
      try {
        for await (const x of it) {
          results[idx] = x;
          if (x) {
            nextDeferred.resolve();
            nextDeferred = Defer();
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to scrap ${urls[idx]}`, { err: marshalErrorLike(err) });
      }
    };
    Promise.all(iterators.map(handler)).finally(() => {
      concluded = true;
      nextDeferred.resolve();
    });
    yield results;
    try {
      while (!concluded) {
        await nextDeferred.promise;
        yield results;
      }
    } finally {
      for (const x of iterators) {
        x.return(void 0);
      }
    }
  }
  configure(opts, req, urlToCrawl) {
    this.threadLocal.set("withGeneratedAlt", opts.withGeneratedAlt);
    this.threadLocal.set("withLinksSummary", opts.withLinksSummary);
    this.threadLocal.set("withImagesSummary", opts.withImagesSummary);
    this.threadLocal.set("keepImgDataUrl", opts.keepImgDataUrl);
    this.threadLocal.set("cacheTolerance", opts.cacheTolerance);
    this.threadLocal.set("userAgent", opts.userAgent);
    this.threadLocal.set("host", req.headers.host || "127.0.0.1:1337");
    if (opts.timeout) {
      this.threadLocal.set("timeout", opts.timeout * 1e3);
    }
    const cookieHeader = req.headers["x-set-cookie"];
    const cookies = cookieHeader ? (Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader]).map((cookie) => {
      const [name, ...valueParts] = cookie.split("=");
      const value = valueParts.join("=");
      return { name, value, url: urlToCrawl.toString() };
    }) : [];
    const cookiesForLog = cookies.map(({ name, url }) => ({ name, url }));
    console.log("Cookies:", cookiesForLog);
    return {
      proxyUrl: opts.proxyUrl,
      cookies,
      favorScreenshot: ["screenshot", "pageshot"].includes(opts.respondWith),
      removeSelector: opts.removeSelector,
      targetSelector: opts.targetSelector,
      waitForSelector: opts.waitForSelector,
      overrideUserAgent: opts.userAgent,
      timeoutMs: opts.timeout ? opts.timeout * 1e3 : void 0,
      withIframe: opts.withIframe,
      viewportWidth: opts.viewportWidth || void 0,
      viewportHeight: opts.viewportHeight || void 0,
      fullPage: opts.fullPage || false,
      pdfAction: opts.pdfAction
    };
  }
  async simpleCrawl(mode, url, opts) {
    const it = this.scrap(url, { ...opts, minIntervalMs: 500 });
    let lastSnapshot;
    let goodEnough = false;
    try {
      for await (const x of it) {
        lastSnapshot = x;
        if (goodEnough) {
          break;
        }
        if (lastSnapshot?.parsed?.content) {
          goodEnough = true;
        }
      }
    } catch (err) {
      if (lastSnapshot) {
        return this.formatSnapshot(mode, lastSnapshot, url);
      }
      throw err;
    }
    if (!lastSnapshot) {
      throw new AssertionFailureError(`No content available`);
    }
    return this.formatSnapshot(mode, lastSnapshot, url);
  }
  async saveFileLocally(fileName, content) {
    const localDir = path.join("/app", "local-storage", "instant-screenshots");
    console.log(`Attempting to save file in directory: ${localDir}`);
    try {
      if (!fs.existsSync(localDir)) {
        console.log(`Directory ${localDir} does not exist. Creating it.`);
        fs.mkdirSync(localDir, { recursive: true });
      }
      const filePath = path.join(localDir, fileName);
      console.log(`Writing file to: ${filePath}`);
      await fs.promises.writeFile(filePath, new Uint8Array(content));
      return `/instant-screenshots/${fileName}`;
    } catch (error) {
      console.error(`Error saving file locally: ${error}`);
      throw error;
    }
  }
  /**
   * Parses the incoming request URL and determines the target URL to crawl
   */
  parseRequestUrl(req) {
    let noSlashURL = req.url.slice(1);
    let forceJsonResponse = false;
    if (noSlashURL.startsWith("json/")) {
      forceJsonResponse = true;
      noSlashURL = noSlashURL.slice(5);
      console.log("JSON endpoint detected, forcing JSON response for URL:", noSlashURL);
    }
    return { url: noSlashURL, forceJson: forceJsonResponse };
  }
  /**
   * Handles special routes (favicon, root path, screenshots)
   * Returns the response if handled, null if should continue with normal flow
   */
  async handleSpecialRoutes(req, res, url) {
    if (url === "favicon.ico") {
      console.log("Favicon request detected");
      sendResponse(res, "Favicon not available", { contentType: "text/plain", code: 404 });
      return true;
    }
    if (!url || url === "/") {
      console.log("Root path requested, returning index");
      await this.serveIndexPage(req, res);
      return true;
    }
    if (url.startsWith("instant-screenshots/")) {
      this.serveScreenshot(url, res);
      return true;
    }
    return false;
  }
  /**
   * Serves the index page with HTML styling
   */
  async serveIndexPage(req, res) {
    const indexPage = this.getIndex(req);
    const markdownContent = indexPage.toString();
    const htmlContent = this.markdownToHtml(markdownContent);
    const fullHtmlPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${indexPage.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        h3 { color: #7f8c8d; }
        code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, 'Consolas', monospace;
        }
        pre {
            background: #2d3748;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 15px 0;
        }
        pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        a {
            color: #3498db;
            text-decoration: none;
            font-weight: 500;
        }
        a:hover {
            color: #2980b9;
            text-decoration: underline;
        }
        .example-links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .example-links a {
            display: block;
            padding: 12px;
            background: #ecf0f1;
            border-radius: 6px;
            border-left: 4px solid #3498db;
            transition: all 0.3s ease;
        }
        .example-links a:hover {
            background: #d5dbdb;
            transform: translateX(5px);
        }
        .emoji { font-size: 1.2em; }
        hr { border: none; border-top: 1px solid #bdc3c7; margin: 30px 0; }
    </style>
</head>
<body>
    <div class="container">
        ${htmlContent}
    </div>
</body>
</html>`;
    sendResponse(res, fullHtmlPage, { contentType: "text/html" });
  }
  /**
   * Sets up thread-local context for the request
   */
  setupRequestContext(req, forceJson) {
    this.threadLocal.set("accept", req.headers.accept || "");
    this.threadLocal.set("x-return-format", req.headers["x-return-format"] || "");
    if (forceJson) {
      this.threadLocal.set("accept", "application/json");
      this.threadLocal.set("x-return-format", "json");
    }
  }
  /**
   * Extracts the target URL from request (POST body, query params, or path)
   */
  extractTargetUrl(req, pathUrl) {
    if (req.method === "POST" && req.body && typeof req.body.url === "string" && req.body.url.trim()) {
      return req.body.url.trim();
    }
    if (req.query && (req.query.url || req.query.u)) {
      const q = req.query.url || req.query.u;
      return Array.isArray(q) ? q[0] : String(q || "");
    }
    return pathUrl;
  }
  /**
   * Validates and parses the target URL
   */
  parseAndValidateUrl(urlToCrawl, req) {
    const requestWithGet = req;
    const requestHeaders = req.headers;
    const protoFromGet = typeof requestWithGet.get === "function" ? requestWithGet.get("x-forwarded-proto") : void 0;
    const headerProto = requestHeaders["x-forwarded-proto"] || requestHeaders["X-Forwarded-Proto"];
    const protocol = protoFromGet || headerProto || "http";
    const hostFromGet = typeof requestWithGet.get === "function" ? requestWithGet.get("host") : void 0;
    const headerHost = requestHeaders.host || requestHeaders.Host;
    const host = hostFromGet || headerHost || "localhost:3000";
    const requestBase = `${protocol}://${host}`;
    const parsedUrl = safeNormalizeUrl(urlToCrawl, requestBase);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid protocol");
    }
    const allowAllTlds = this.config.domain?.allow_all_tlds || false;
    if (!allowAllTlds && !this.isValidTLD(parsedUrl.hostname)) {
      throw new Error("Invalid TLD");
    }
    return parsedUrl;
  }
  /**
   * Checks robots.txt compliance for the given URL
   */
  async checkRobotsCompliance(parsedUrl) {
    const respectRobots = this.config.robots?.respect_robots_txt !== false;
    if (!respectRobots) {
      return true;
    }
    console.log("Checking robots.txt compliance for:", parsedUrl.toString());
    try {
      const robotsCheckerWithMethods = this.robotsChecker;
      const hasIsAllowed = robotsCheckerWithMethods && typeof robotsCheckerWithMethods.isAllowed === "function";
      const hasGetCrawlDelay = robotsCheckerWithMethods && typeof robotsCheckerWithMethods.getCrawlDelay === "function";
      if (hasIsAllowed && robotsCheckerWithMethods.isAllowed) {
        const isAllowed = await robotsCheckerWithMethods.isAllowed(parsedUrl.toString(), "DearReader-Bot");
        if (!isAllowed) {
          console.log("URL blocked by robots.txt:", parsedUrl.toString());
          return false;
        }
      } else {
        console.log("robotsChecker.isAllowed not available; skipping robots.txt allow check");
      }
      if (hasGetCrawlDelay && robotsCheckerWithMethods.getCrawlDelay) {
        const crawlDelay = await robotsCheckerWithMethods.getCrawlDelay(parsedUrl.toString(), "DearReader-Bot");
        if (crawlDelay && crawlDelay > 0) {
          console.log(`Applying crawl delay of ${crawlDelay}s for:`, parsedUrl.toString());
        }
      } else {
        console.log("robotsChecker.getCrawlDelay not available; skipping crawl-delay handling");
      }
      return true;
    } catch (robotsError) {
      console.log("Error checking robots.txt, proceeding:", robotsError);
      return true;
    }
  }
  /**
   * Performs the actual scraping operation
   */
  async performScraping(parsedUrl, crawlerOptions, req) {
    const crawlOpts = this.configure(crawlerOptions, req, parsedUrl);
    console.log("Configured crawl options:", crawlOpts);
    let lastScrapped;
    const scrapIterator = this.scrap(parsedUrl, crawlOpts, crawlerOptions);
    for await (const scrapped of scrapIterator) {
      lastScrapped = scrapped;
      if (crawlerOptions.waitForSelector || (!scrapped?.parsed?.content || !scrapped.title?.trim()) && !scrapped?.pdfs?.length) {
        continue;
      }
      if (crawlerOptions.timeout === void 0) {
        const formatted2 = await this.formatSnapshot(crawlerOptions.respondWith, scrapped, parsedUrl);
        return { snapshot: scrapped, formatted: formatted2 };
      }
    }
    if (!lastScrapped) {
      return null;
    }
    const formatted = await this.formatSnapshot(crawlerOptions.respondWith, lastScrapped, parsedUrl);
    return { snapshot: lastScrapped, formatted };
  }
  /**
   * Handles scraping errors with appropriate error responses
   */
  async handleScrapingError(error, parsedUrl, crawlerOptions) {
    console.error("Error during scraping:", error);
    if (error instanceof AssertionFailureError && (error.message.includes("Invalid TLD") || error.message.includes("ERR_NAME_NOT_RESOLVED"))) {
      const errorSnapshot = {
        title: "Error: Invalid domain or TLD",
        href: parsedUrl.toString(),
        html: "",
        text: `Failed to access the page due to an invalid domain or TLD: ${parsedUrl.toString()}`,
        error: "Invalid domain or TLD"
      };
      const formatted = await this.formatSnapshot(crawlerOptions.respondWith, errorSnapshot, parsedUrl);
      return { snapshot: errorSnapshot, formatted };
    }
    throw error;
  }
  async crawl(req, res) {
    this.logger.info(`Crawl request received for URL: ${req.url}`);
    console.log("Crawl method called with request:", req.url);
    try {
      const { url: noSlashURL, forceJson: forceJsonResponse } = this.parseRequestUrl(req);
      if (await this.handleSpecialRoutes(req, res, noSlashURL)) {
        return;
      }
      this.setupRequestContext(req, forceJsonResponse);
      const crawlerOptions = req.method === "POST" ? CrawlerOptions.from(req.body, req) : CrawlerOptions.from(req.query, req);
      console.log("Crawler options:", crawlerOptions);
      const urlToCrawl = this.extractTargetUrl(req, noSlashURL);
      let parsedUrl;
      try {
        parsedUrl = this.parseAndValidateUrl(urlToCrawl, req);
      } catch (error) {
        console.log("Invalid URL:", urlToCrawl, error);
        return sendResponse(res, "Invalid URL or TLD", { contentType: "text/plain", code: 400 });
      }
      const robotsAllowed = await this.checkRobotsCompliance(parsedUrl);
      if (!robotsAllowed) {
        return sendResponse(res, "Access denied by robots.txt", { contentType: "text/plain", code: 403 });
      }
      this.puppeteerControl.circuitBreakerHosts.add(req.hostname.toLowerCase());
      console.log("Added to circuit breaker hosts:", req.hostname.toLowerCase());
      let result = null;
      try {
        result = await this.performScraping(parsedUrl, crawlerOptions, req);
      } catch (scrapError) {
        result = await this.handleScrapingError(scrapError, parsedUrl, crawlerOptions);
      }
      if (!result) {
        return sendResponse(res, "No content available", { contentType: "text/plain", code: 404 });
      }
      return this.sendFormattedResponse(res, result.formatted, crawlerOptions.respondWith, result.snapshot);
    } catch (error) {
      console.error("Error in crawl method:", error);
      return sendResponse(res, "Internal server error", { contentType: "text/plain", code: 500 });
    }
  }
};
CrawlerHost.md5Hasher = new HashManager("md5", "hex");
CrawlerHost = __decorateClass([
  singleton()
], CrawlerHost);
export {
  CrawlerHost
};
//# sourceMappingURL=crawler.js.map
