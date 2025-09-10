
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

import config from "../config.js";
class Semaphore {
  constructor(maxPermits) {
    this.maxPermits = maxPermits;
    this.waiting = [];
    this.permits = maxPermits;
  }
  async acquire() {
    if (this.permits > 0) {
      this.permits -= 1;
      return () => {
        this.permits += 1;
        this._drainWaiting();
      };
    }
    return new Promise((resolve) => {
      this.waiting.push((release) => resolve(release));
    });
  }
  _drainWaiting() {
    if (this.waiting.length > 0 && this.permits > 0) {
      const waiter = this.waiting.shift();
      this.permits -= 1;
      waiter(() => {
        this.permits += 1;
        this._drainWaiting();
      });
    }
  }
}
const globalSemaphore = new Semaphore(config.concurrency?.max_api_concurrency || 50);
const clientSemaphores = /* @__PURE__ */ new Map();
function getClientId(req) {
  return req.headers["x-api-key"] || (req.ip || req.connection?.remoteAddress || "anon");
}
function concurrencyMiddleware(req, res, next) {
  const clientId = getClientId(req);
  const clientCfg = { max: config.concurrency?.default_client_concurrency || 5, maxQueue: config.concurrency?.max_queue_length_per_client || 20 };
  let clientState = clientSemaphores.get(clientId);
  if (!clientState) {
    clientState = { sem: new Semaphore(clientCfg.max), queued: 0 };
    clientSemaphores.set(clientId, clientState);
  }
  if (clientState.queued >= clientCfg.maxQueue) {
    res.setHeader("Retry-After", "5");
    return res.status(429).json({ error: "Client queue limit exceeded, try again later" });
  }
  clientState.queued += 1;
  globalSemaphore.acquire().then((releaseGlobal) => {
    clientState.queued -= 1;
    clientState.sem.acquire().then((releaseClient) => {
      const cleanup = () => {
        try {
          releaseClient();
        } catch {
        }
        try {
          releaseGlobal();
        } catch {
        }
      };
      res.once("finish", cleanup);
      res.once("close", cleanup);
      next();
    }).catch(() => {
      try {
        releaseGlobal();
      } catch {
      }
      res.setHeader("Retry-After", "1");
      res.status(503).json({ error: "Failed to acquire client semaphore" });
    });
  }).catch(() => {
    res.setHeader("Retry-After", "1");
    res.status(503).json({ error: "Server busy, try again later" });
  });
}
export {
  concurrencyMiddleware
};
//# sourceMappingURL=concurrency.js.map
