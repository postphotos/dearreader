
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
import { CloudHTTPv2 } from "./decorators.js";
import { Logger } from "./logger.js";
import { OutputServerEventStream } from "./output-stream.js";
import { RPCReflect } from "./rpc-reflect.js";
import { injectable } from "tsyringe";
import * as fs from "fs";
import * as path from "path";
let AsyncContext = class {
  constructor() {
    this.storage = /* @__PURE__ */ new Map();
  }
  set(key, value) {
    this.storage.set(key, value);
  }
  get(key) {
    return this.storage.get(key);
  }
};
AsyncContext = __decorateClass([
  injectable()
], AsyncContext);
class InsufficientBalanceError extends Error {
  constructor(message) {
    super(message);
    this.name = "InsufficientBalanceError";
  }
}
function Param(name, options) {
  return (target, propertyKey, parameterIndex) => {
  };
}
let FirebaseStorageBucketControl = class {
  constructor() {
    const preferred = process.env.LOCAL_STORAGE_DIR || path.join("/app", "local-storage");
    const fallback = path.join(process.cwd(), "storage");
    let chosen = preferred;
    try {
      if (!fs.existsSync(preferred)) {
        fs.mkdirSync(preferred, { recursive: true });
      }
      chosen = preferred;
    } catch (e) {
      if (!fs.existsSync(fallback)) {
        try {
          fs.mkdirSync(fallback, { recursive: true });
        } catch (e2) {
          chosen = path.join(process.cwd(), ".local-storage");
          if (!fs.existsSync(chosen)) {
            fs.mkdirSync(chosen, { recursive: true });
          }
        }
      } else {
      }
      chosen = fs.existsSync(fallback) ? fallback : chosen;
    }
    this.localStorageDir = chosen;
  }
  async uploadFile(filePath, destination) {
    const destPath = path.join(this.localStorageDir, destination);
    await fs.promises.copyFile(filePath, destPath);
    return `file://${destPath}`;
  }
  async downloadFile(filePath, destination) {
    const sourcePath = path.join(this.localStorageDir, filePath);
    await fs.promises.copyFile(sourcePath, destination);
  }
  async deleteFile(filePath) {
    const fullPath = path.join(this.localStorageDir, filePath);
    await fs.promises.unlink(fullPath);
  }
  async fileExists(filePath) {
    const fullPath = path.join(this.localStorageDir, filePath);
    return fs.existsSync(fullPath);
  }
  async saveFile(filePath, content, options) {
    const fullPath = path.join(this.localStorageDir, filePath);
    await fs.promises.writeFile(fullPath, new Uint8Array(content));
  }
  async signDownloadUrl(filePath, expirationTime) {
    const fullPath = path.join(this.localStorageDir, filePath);
    return `file://${fullPath}`;
  }
};
FirebaseStorageBucketControl = __decorateClass([
  injectable()
], FirebaseStorageBucketControl);
const loadModulesDynamically = (path2) => {
  console.log(`Loading modules from ${path2}`);
};
const registry = {
  exportAll: () => ({}),
  exportGrouped: () => ({}),
  allHandsOnDeck: async () => {
  }
};
export {
  AsyncContext,
  CloudHTTPv2,
  FirebaseStorageBucketControl,
  InsufficientBalanceError,
  Logger,
  OutputServerEventStream,
  Param,
  RPCReflect,
  loadModulesDynamically,
  registry
};
//# sourceMappingURL=index.js.map
