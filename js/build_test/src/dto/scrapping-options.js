
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
import { Also, AutoCastable, Prop } from "civkit";
import { parseString as parseSetCookieString } from "set-cookie-parser";
let CrawlerOptions = class extends AutoCastable {
  static from(input, ...args) {
    const instance = super.from(input, ...args);
    const req = args[0];
    if (req) {
      console.log("Request headers:", req.headers);
      const getHeader = (name) => {
        const value = req.headers[name.toLowerCase()];
        return Array.isArray(value) ? value[0] : value;
      };
      const customMode = getHeader("X-Respond-With") || getHeader("X-Return-Format");
      if (customMode) {
        instance.respondWith = customMode;
      }
      const withGeneratedAlt = getHeader("X-With-Generated-Alt");
      if (withGeneratedAlt !== void 0) {
        instance.withGeneratedAlt = withGeneratedAlt.toLowerCase() === "true";
      }
      const withLinksSummary = getHeader("x-with-links-summary");
      if (withLinksSummary !== void 0) {
        instance.withLinksSummary = Boolean(withLinksSummary);
      }
      const withImagesSummary = getHeader("x-with-images-summary");
      if (withImagesSummary !== void 0) {
        instance.withImagesSummary = Boolean(withImagesSummary);
      }
      const noCache = getHeader("x-no-cache");
      if (noCache !== void 0) {
        instance.noCache = Boolean(noCache);
      }
      if (instance.noCache && instance.cacheTolerance === void 0) {
        instance.cacheTolerance = 0;
      }
      let cacheTolerance = parseInt(getHeader("x-cache-tolerance") || "");
      if (!isNaN(cacheTolerance)) {
        instance.cacheTolerance = cacheTolerance;
      }
      let timeoutSeconds = parseInt(getHeader("x-timeout") || "");
      if (!isNaN(timeoutSeconds) && timeoutSeconds > 0) {
        instance.timeout = timeoutSeconds <= 180 ? timeoutSeconds : 180;
      } else if (getHeader("x-timeout")) {
        instance.timeout = null;
      }
      const removeSelector = getHeader("x-remove-selector")?.split(", ");
      instance.removeSelector ??= removeSelector;
      const targetSelector = getHeader("x-target-selector")?.split(", ");
      instance.targetSelector ??= targetSelector;
      const waitForSelector = getHeader("x-wait-for-selector")?.split(", ");
      instance.waitForSelector ??= waitForSelector || instance.targetSelector;
      instance.targetSelector = filterSelector(instance.targetSelector);
      const overrideUserAgent = getHeader("x-user-agent");
      instance.userAgent ??= overrideUserAgent;
      const keepImgDataUrl = getHeader("x-keep-img-data-url");
      if (keepImgDataUrl !== void 0) {
        instance.keepImgDataUrl = Boolean(keepImgDataUrl);
      }
      const withIframe = getHeader("x-with-iframe");
      if (withIframe !== void 0) {
        instance.withIframe = Boolean(withIframe);
      }
      if (instance.withIframe) {
        instance.timeout ??= null;
      }
      let viewportWidth = parseInt(getHeader("x-viewport-width") || "");
      if (!isNaN(viewportWidth) && viewportWidth > 0) {
        instance.viewportWidth = viewportWidth;
      }
      let viewportHeight = parseInt(getHeader("x-viewport-height") || "");
      if (!isNaN(viewportHeight) && viewportHeight > 0) {
        instance.viewportHeight = viewportHeight;
      }
      const fullPage = getHeader("x-full-page");
      if (fullPage !== void 0) {
        instance.fullPage = fullPage.toLowerCase() === "true";
      }
      const pdfAction = getHeader("x-pdf-action");
      if (pdfAction) {
        instance.pdfAction = pdfAction;
      }
      const cookies = [];
      const setCookieHeaders = getHeader("x-set-cookie")?.split(", ") || instance.setCookies;
      if (Array.isArray(setCookieHeaders)) {
        for (const setCookie of setCookieHeaders) {
          const parsed = parseSetCookieString(setCookie, { decodeValues: false });
          if (Array.isArray(parsed)) {
            for (const p of parsed) {
              cookies.push({
                name: p.name,
                value: p.value,
                url: p.url,
                domain: p.domain,
                path: p.path,
                secure: p.secure,
                httpOnly: p.httpOnly,
                sameSite: p.sameSite,
                expires: typeof p.expires === "number" ? p.expires : p.expires instanceof Date ? Math.floor(p.expires.getTime() / 1e3) : void 0
              });
            }
          } else if (parsed && typeof parsed === "object") {
            const p = parsed;
            cookies.push({
              name: p.name,
              value: p.value,
              url: p.url,
              domain: p.domain,
              path: p.path,
              secure: p.secure,
              httpOnly: p.httpOnly,
              sameSite: p.sameSite,
              expires: typeof p.expires === "number" ? p.expires : p.expires instanceof Date ? Math.floor(p.expires.getTime() / 1e3) : void 0
            });
          }
        }
      } else if (setCookieHeaders && typeof setCookieHeaders === "string") {
        const parsed = parseSetCookieString(setCookieHeaders, { decodeValues: false });
        if (Array.isArray(parsed)) {
          for (const p of parsed) {
            cookies.push({
              name: p.name,
              value: p.value,
              url: p.url,
              domain: p.domain,
              path: p.path,
              secure: p.secure,
              httpOnly: p.httpOnly,
              sameSite: p.sameSite,
              expires: typeof p.expires === "number" ? p.expires : p.expires instanceof Date ? Math.floor(p.expires.getTime() / 1e3) : void 0
            });
          }
        } else if (parsed && typeof parsed === "object") {
          const p = parsed;
          cookies.push({
            name: p.name,
            value: p.value,
            url: p.url,
            domain: p.domain,
            path: p.path,
            secure: p.secure,
            httpOnly: p.httpOnly,
            sameSite: p.sameSite,
            expires: typeof p.expires === "number" ? p.expires : p.expires instanceof Date ? Math.floor(p.expires.getTime() / 1e3) : void 0
          });
        }
      }
      const proxyUrl = getHeader("x-proxy-url");
      instance.proxyUrl ??= proxyUrl;
      if (instance.cacheTolerance) {
        instance.cacheTolerance = instance.cacheTolerance * 1e3;
      }
    }
    return instance;
  }
};
__decorateClass([
  Prop()
], CrawlerOptions.prototype, "url", 2);
__decorateClass([
  Prop()
], CrawlerOptions.prototype, "html", 2);
__decorateClass([
  Prop({
    default: "default"
  })
], CrawlerOptions.prototype, "respondWith", 2);
__decorateClass([
  Prop({
    default: false
  })
], CrawlerOptions.prototype, "withGeneratedAlt", 2);
__decorateClass([
  Prop({
    default: false
  })
], CrawlerOptions.prototype, "withLinksSummary", 2);
__decorateClass([
  Prop({
    default: false
  })
], CrawlerOptions.prototype, "withImagesSummary", 2);
__decorateClass([
  Prop({
    default: false
  })
], CrawlerOptions.prototype, "noCache", 2);
__decorateClass([
  Prop()
], CrawlerOptions.prototype, "cacheTolerance", 2);
__decorateClass([
  Prop({ arrayOf: String })
], CrawlerOptions.prototype, "targetSelector", 2);
__decorateClass([
  Prop({ arrayOf: String })
], CrawlerOptions.prototype, "waitForSelector", 2);
__decorateClass([
  Prop({ arrayOf: String })
], CrawlerOptions.prototype, "removeSelector", 2);
__decorateClass([
  Prop({
    default: false
  })
], CrawlerOptions.prototype, "keepImgDataUrl", 2);
__decorateClass([
  Prop({
    default: false
  })
], CrawlerOptions.prototype, "withIframe", 2);
__decorateClass([
  Prop({
    arrayOf: String
  })
], CrawlerOptions.prototype, "setCookies", 2);
__decorateClass([
  Prop()
], CrawlerOptions.prototype, "proxyUrl", 2);
__decorateClass([
  Prop()
], CrawlerOptions.prototype, "userAgent", 2);
__decorateClass([
  Prop({
    validate: (v) => v > 0 && v <= 180,
    type: Number,
    nullable: true
  })
], CrawlerOptions.prototype, "timeout", 2);
__decorateClass([
  Prop({
    type: Number,
    nullable: true
  })
], CrawlerOptions.prototype, "viewportWidth", 2);
__decorateClass([
  Prop({
    type: Number,
    nullable: true
  })
], CrawlerOptions.prototype, "viewportHeight", 2);
__decorateClass([
  Prop({
    default: false
  })
], CrawlerOptions.prototype, "fullPage", 2);
__decorateClass([
  Prop()
], CrawlerOptions.prototype, "pdfAction", 2);
CrawlerOptions = __decorateClass([
  Also({
    openapi: {
      operation: {
        parameters: {
          "Accept": {
            description: `Specifies your preference for the response format.

Supported formats: 
- text/event-stream
- application/json or text/json
- text/plain`,
            in: "header",
            schema: { type: "string" }
          },
          "X-Cache-Tolerance": {
            description: `Sets internal cache tolerance in seconds if this header is specified with a integer.`,
            in: "header",
            schema: { type: "string" }
          },
          "X-No-Cache": {
            description: `Ignores internal cache if this header is specified with a value.

Equivalent to X-Cache-Tolerance: 0`,
            in: "header",
            schema: { type: "string" }
          },
          "X-Respond-With": {
            description: `Specifies the (non-default) form factor of the crawled data you prefer.

Supported formats: 
- markdown
- html
- text
- pageshot
- screenshot
`,
            in: "header",
            schema: { type: "string" }
          },
          "X-Wait-For-Selector": {
            description: `Specifies a CSS selector to wait for the appearance of such an element before returning.

Example: \`X-Wait-For-Selector: .content-block\`
`,
            in: "header",
            schema: { type: "string" }
          },
          "X-Target-Selector": {
            description: `Specifies a CSS selector for return target instead of the full html.

Implies \`X-Wait-For-Selector: (same selector)\``,
            in: "header",
            schema: { type: "string" }
          },
          "X-Remove-Selector": {
            description: `Specifies a CSS selector to remove elements from the full html.

Example \`X-Remove-Selector: nav\``,
            in: "header",
            schema: { type: "string" }
          },
          "X-Keep-Img-Data-Url": {
            description: `Keep data-url as it instead of transforming them to object-url. (Only applicable when targeting markdown format)

Example \`X-Keep-Img-Data-Url: true\``,
            in: "header",
            schema: { type: "string" }
          },
          "X-Proxy-Url": {
            description: `Specifies your custom proxy if you prefer to use one.

Supported protocols: 
- http
- https
- socks4
- socks5

For authentication, https://user:pass@host:port`,
            in: "header",
            schema: { type: "string" }
          },
          "X-Set-Cookie": {
            description: `Sets cookie(s) to the headless browser for your request. 

Syntax is the same with standard Set-Cookie`,
            in: "header",
            schema: { type: "string" }
          },
          "X-With-Generated-Alt": {
            description: `Enable automatic alt-text generating for images without an meaningful alt-text.

Note: Does not work when \`X-Respond-With\` is specified`,
            in: "header",
            schema: { type: "string" }
          },
          "X-With-Images-Summary": {
            description: `Enable dedicated summary section for images on the page.`,
            in: "header",
            schema: { type: "string" }
          },
          "X-With-links-Summary": {
            description: `Enable dedicated summary section for hyper links on the page.`,
            in: "header",
            schema: { type: "string" }
          },
          "X-User-Agent": {
            description: `Override User-Agent.`,
            in: "header",
            schema: { type: "string" }
          },
          "X-Timeout": {
            description: `Specify timeout in seconds. Max 180.`,
            in: "header",
            schema: { type: "string" }
          }
        }
      }
    }
  })
], CrawlerOptions);
class CrawlerOptionsHeaderOnly extends CrawlerOptions {
  static from(...args) {
    const req = args[0];
    return super.from({}, req);
  }
}
function filterSelector(s) {
  if (!s) {
    return s;
  }
  const sr = Array.isArray(s) ? s : [s];
  const selectors = sr.filter((i) => {
    const innerSelectors = i.split(",").map((s2) => s2.trim());
    const someViolation = innerSelectors.find((x) => x.startsWith("*") || x.startsWith(":") || x.includes("*:"));
    if (someViolation) {
      return false;
    }
    return true;
  });
  return selectors;
}
;
export {
  CrawlerOptions,
  CrawlerOptionsHeaderOnly
};
//# sourceMappingURL=scrapping-options.js.map
