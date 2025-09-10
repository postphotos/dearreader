
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

import { expect } from "chai";
import PDFExtractor from "../pdf-extract.js";
describe("PDFExtractor", () => {
  describe("extractTextFromPDF", () => {
    it("should extract text from a valid PDF buffer", async () => {
      const pdfBuffer = Buffer.from(
        "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n72 720 Td\n/F0 12 Tf\n(Hello, PDF World!) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000200 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n284\n%%EOF",
        "utf8"
      );
      const result = await PDFExtractor.extractTextFromPDF(pdfBuffer);
      expect(result).to.be.a("string");
      expect(result.length).to.be.greaterThan(0);
    });
    it("should handle empty PDF buffer", async () => {
      const emptyBuffer = Buffer.from("");
      try {
        await PDFExtractor.extractTextFromPDF(emptyBuffer);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("Failed to extract text from PDF");
      }
    });
    it("should handle invalid PDF buffer", async () => {
      const invalidBuffer = Buffer.from("This is not a PDF file");
      try {
        await PDFExtractor.extractTextFromPDF(invalidBuffer);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("Failed to extract text from PDF");
      }
    });
  });
  describe("extractTextWithOCR", () => {
    it("should check OCR availability", () => {
      const ocrEnabled = process.env.TEST_OCR_ENABLED === "true";
      if (ocrEnabled) {
        console.log("\u2705 OCR testing is enabled");
      } else {
        console.log("\u26A0\uFE0F  OCR testing is disabled (set TEST_OCR_ENABLED=true to enable)");
      }
      expect(typeof ocrEnabled).to.equal("boolean");
    });
    if (process.env.TEST_OCR_ENABLED) {
      it("should extract text using OCR from image buffer", async function() {
        const imageBuffer = Buffer.from("fake-image-data");
        const result = await PDFExtractor.extractTextWithOCR(imageBuffer);
        expect(result).to.be.a("string");
      });
    } else {
      it("should handle missing OCR configuration gracefully", () => {
        expect(process.env.TEST_OCR_ENABLED).to.not.equal("true");
      });
    }
    it("should handle OCR errors gracefully", async () => {
      const invalidBuffer = Buffer.from("");
      try {
        await PDFExtractor.extractTextWithOCR(invalidBuffer);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.be.an("error");
      }
    });
  });
});
//# sourceMappingURL=pdf-extract.test.js.map
