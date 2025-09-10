// Minimal DOMMatrix polyfill for Node runtime used by pdfjs
class DOMMatrixPolyfill {
    constructor() {
        this.is2D = true;
    }
}
// @ts-ignore - intentionally global
globalThis.DOMMatrix = globalThis.DOMMatrix || DOMMatrixPolyfill;
export default globalThis.DOMMatrix;
//# sourceMappingURL=dommatrix.js.map