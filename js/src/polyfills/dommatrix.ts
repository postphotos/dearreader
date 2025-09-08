// Minimal DOMMatrix polyfill for Node runtime used by pdfjs
class DOMMatrixPolyfill {
  is2D = true;
  constructor() {}
}

// @ts-ignore - intentionally global
globalThis.DOMMatrix = (globalThis as any).DOMMatrix || (DOMMatrixPolyfill as any);

export default (globalThis as any).DOMMatrix;
