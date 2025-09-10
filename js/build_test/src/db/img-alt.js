
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
import { Also, Prop } from "civkit";
import { FirestoreRecord } from "../shared/lib/firestore.js";
let ImgAlt = class extends FirestoreRecord {
};
ImgAlt.collectionName = "imgAlts";
__decorateClass([
  Prop({
    required: true
  })
], ImgAlt.prototype, "src", 2);
__decorateClass([
  Prop({
    required: true
  })
], ImgAlt.prototype, "urlDigest", 2);
__decorateClass([
  Prop()
], ImgAlt.prototype, "width", 2);
__decorateClass([
  Prop()
], ImgAlt.prototype, "height", 2);
__decorateClass([
  Prop()
], ImgAlt.prototype, "generatedAlt", 2);
__decorateClass([
  Prop()
], ImgAlt.prototype, "originalAlt", 2);
__decorateClass([
  Prop()
], ImgAlt.prototype, "createdAt", 2);
__decorateClass([
  Prop()
], ImgAlt.prototype, "expireAt", 2);
ImgAlt = __decorateClass([
  Also({
    dictOf: Object
  })
], ImgAlt);
export {
  ImgAlt
};
//# sourceMappingURL=img-alt.js.map
