
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
import { AsyncService } from "civkit";
import { singleton } from "tsyringe";
import { Logger } from "../logger.js";
let CanvasService = class extends AsyncService {
  constructor() {
    super();
    this.logger = new Logger("CanvasService");
  }
  async init() {
    this.logger.info("CanvasService initialized");
    this.emit("ready");
  }
  async loadImage(url) {
    console.log(`Mock: Loading image from ${url}`);
    return { width: 1e3, height: 1e3 };
  }
  fitImageToSquareBox(img, size) {
    console.log(`Mock: Fitting image to square box of size ${size}`);
    return { width: size, height: size };
  }
  async canvasToBuffer(canvas, format) {
    console.log(`Mock: Converting canvas to buffer with format ${format}`);
    return Buffer.from("mock image data");
  }
};
CanvasService = __decorateClass([
  singleton()
], CanvasService);
export {
  CanvasService
};
//# sourceMappingURL=canvas.js.map
