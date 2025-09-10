
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
import { injectable } from "tsyringe";
import winston from "winston";
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "dearreader" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, scope, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
          return `${timestamp} [${scope || "App"}] ${level}: ${message} ${metaStr}`;
        })
      )
    })
  ]
});
if (process.env.NODE_ENV === "production") {
  winstonLogger.add(new winston.transports.File({
    filename: "logs/error.log",
    level: "error",
    maxsize: 5242880,
    // 5MB
    maxFiles: 5
  }));
  winstonLogger.add(new winston.transports.File({
    filename: "logs/combined.log",
    maxsize: 5242880,
    // 5MB
    maxFiles: 5
  }));
}
let Logger = class {
  constructor(name) {
    this.name = name;
  }
  info(message, meta) {
    winstonLogger.info(message, { scope: this.name, ...meta });
  }
  warn(message, meta) {
    winstonLogger.warn(message, { scope: this.name, ...meta });
  }
  error(message, meta) {
    winstonLogger.error(message, { scope: this.name, ...meta });
  }
  debug(message, meta) {
    winstonLogger.debug(message, { scope: this.name, ...meta });
  }
  child(options) {
    return new Logger(`${this.name}:${options.service}`);
  }
  // Helper method for performance timing
  time(label) {
    console.time(`[${this.name}] ${label}`);
  }
  timeEnd(label) {
    console.timeEnd(`[${this.name}] ${label}`);
  }
  // Helper for logging HTTP requests
  httpRequest(method, url, statusCode, responseTime) {
    this.info("HTTP Request", {
      method,
      url,
      statusCode,
      responseTime: responseTime ? `${responseTime}ms` : void 0
    });
  }
  // Helper for logging errors with stack traces
  errorWithStack(message, error, meta) {
    this.error(message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...meta
    });
  }
};
Logger = __decorateClass([
  injectable()
], Logger);
export {
  Logger
};
//# sourceMappingURL=logger.js.map
