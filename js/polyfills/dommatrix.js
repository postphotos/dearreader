// Minimal DOMMatrix polyfill for Node runtime used by pdfjs
class DOMMatrixPolyfill {
  constructor() {
    // identity matrix stub
    this.is2D = true;
  }
}

globalThis.DOMMatrix = globalThis.DOMMatrix || DOMMatrixPolyfill;

export default globalThis.DOMMatrix;
