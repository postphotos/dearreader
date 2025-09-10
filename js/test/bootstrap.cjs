// Test bootstrap (CJS): preload reflect-metadata and DOMMatrix polyfill for pdfjs
require('reflect-metadata');
// Minimal DOMMatrix polyfill to satisfy pdfjs in Node test environments.
// This is intentionally small and only implements what pdfjs uses in tests.
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrix {
    constructor(init) {
      if (typeof init === 'string') {
        // very naive parse for matrix(a, b, c, d, e, f)
        const nums = (init.match(/-?\d+\.?\d*/g) || []).map(Number);
        this.a = nums[0] ?? 1;
        this.b = nums[1] ?? 0;
        this.c = nums[2] ?? 0;
        this.d = nums[3] ?? 1;
        this.e = nums[4] ?? 0;
        this.f = nums[5] ?? 0;
      } else if (Array.isArray(init) || ArrayBuffer.isView(init)) {
        const arr = Array.from(init);
        this.a = arr[0] ?? 1;
        this.b = arr[1] ?? 0;
        this.c = arr[2] ?? 0;
        this.d = arr[3] ?? 1;
        this.e = arr[4] ?? 0;
        this.f = arr[5] ?? 0;
      } else {
        this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      }
    }
    toFloat64Array() {
      return new Float64Array([this.a, this.b, this.c, this.d, this.e, this.f]);
    }
  }
  globalThis.DOMMatrix = DOMMatrix;
}
