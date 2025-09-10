
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

import axios from "axios";
class RobotsChecker {
  constructor() {
    this.robotsTxtCache = /* @__PURE__ */ new Map();
  }
  async checkAccess(url, userAgent = "*", path = "/") {
    try {
      const baseUrl = new URL(url).origin;
      const robotsUrl = `${baseUrl}/robots.txt`;
      let robotsTxt = this.robotsTxtCache.get(robotsUrl);
      if (!robotsTxt) {
        const response = await axios.get(robotsUrl);
        robotsTxt = response.data;
        this.robotsTxtCache.set(robotsUrl, robotsTxt);
      }
      const rules = this.parseRobotsTxt(robotsTxt);
      const applicableRules = rules[userAgent] || rules["*"] || [];
      for (const rule of applicableRules) {
        if (rule.path === path || path.startsWith(rule.path)) {
          return { allowed: rule.allow };
        }
      }
      return { allowed: true };
    } catch (error) {
      return { allowed: false, reason: "Failed to fetch or parse robots.txt" };
    }
  }
  parseRobotsTxt(robotsTxt) {
    const rules = {};
    let currentUserAgent = "";
    const lines = robotsTxt.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("User-agent:")) {
        currentUserAgent = trimmed.split(":")[1].trim();
        rules[currentUserAgent] = rules[currentUserAgent] || [];
      } else if (trimmed.startsWith("Disallow:") || trimmed.startsWith("Allow:")) {
        if (currentUserAgent) {
          const parts = trimmed.split(":");
          const directive = parts[0].trim();
          const path = parts[1].trim();
          const allow = directive === "Allow";
          rules[currentUserAgent].push({ path, allow });
        }
      }
    }
    return rules;
  }
  async isAllowed(url, userAgent = "*") {
    const result = await this.checkAccess(url, userAgent);
    return result.allowed;
  }
  async getCrawlDelay(url, userAgent = "*") {
    return 1;
  }
}
export {
  RobotsChecker
};
//# sourceMappingURL=robots-checker.js.map
