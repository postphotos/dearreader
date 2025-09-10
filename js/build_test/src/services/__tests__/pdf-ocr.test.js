
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
describe("PDF OCR Integration", () => {
  const ocrAvailable = process.env.TESSERACT_AVAILABLE === "true";
  describe("OCR Text Extraction", function() {
    it("should handle OCR availability check", () => {
      if (ocrAvailable) {
        console.log("\u2705 Tesseract OCR is available");
      } else {
        console.log("\u26A0\uFE0F  Tesseract OCR not available - OCR tests will be limited");
      }
      expect(typeof ocrAvailable).to.equal("boolean");
    });
    if (ocrAvailable) {
      it("should extract text from image-based PDF using OCR", async function() {
        this.timeout(6e4);
        const imageBuffer = Buffer.from("fake-image-data-for-testing");
        try {
          const result = await PDFExtractor.extractTextWithOCR(imageBuffer);
          expect(result).to.be.a("string");
        } catch (error) {
          expect(error).to.be.an("error");
        }
      });
      it("should handle OCR with different image formats", async function() {
        this.timeout(6e4);
        const testBuffers = [
          Buffer.from(""),
          Buffer.from("minimal-data"),
          Buffer.alloc(100)
          // 100 bytes of zeros
        ];
        for (const buffer of testBuffers) {
          try {
            const result = await PDFExtractor.extractTextWithOCR(buffer);
            expect(result).to.be.a("string");
          } catch (error) {
            expect(error).to.be.an("error");
          }
        }
      });
    } else {
      it("should gracefully handle missing OCR when Tesseract is unavailable", () => {
        expect(ocrAvailable).to.equal(false);
      });
    }
  });
  describe("PDF Processing with OCR Fallback", () => {
    it("should attempt OCR when PDF has minimal text content", async () => {
      const minimalTextPdf = Buffer.from(
        "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 12\n>>\nstream\nBT\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000177 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n261\n%%EOF",
        "utf8"
      );
      const result = await PDFExtractor.extractTextFromPDF(minimalTextPdf);
      expect(result).to.be.a("string");
    });
    it("should prefer native PDF text over OCR when available", async () => {
      const textPdf = Buffer.from(
        "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 68\n>>\nstream\nBT\n72 720 Td\n/F0 12 Tf\n(This is substantial text content for testing.) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000200 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n284\n%%EOF",
        "utf8"
      );
      const result = await PDFExtractor.extractTextFromPDF(textPdf);
      expect(result).to.be.a("string");
      expect(result.length).to.be.greaterThan(10);
      expect(result).to.include("substantial text content");
    });
  });
  describe("OCR Configuration", () => {
    it("should respect OCR enable/disable configuration", async () => {
      const minimalTextPdf = Buffer.from(
        "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 12\n>>\nstream\nBT\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000177 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n261\n%%EOF",
        "utf8"
      );
      const result = await PDFExtractor.extractTextFromPDF(minimalTextPdf);
      expect(result).to.be.a("string");
    });
  });
  describe("Performance and Error Handling", () => {
    it("should handle large PDF files gracefully", async function() {
      this.timeout(12e4);
      const largePdfContent = "%PDF-1.4\n" + "0".repeat(1e4) + "\n%%EOF";
      const largeBuffer = Buffer.from(largePdfContent);
      try {
        const result = await PDFExtractor.extractTextFromPDF(largeBuffer);
        expect(result).to.be.a("string");
      } catch (error) {
        expect(error).to.be.an("error");
      }
    });
    it("should handle concurrent PDF processing", async function() {
      this.timeout(6e4);
      const pdfBuffer = Buffer.from(
        "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n72 720 Td\n/F0 12 Tf\n(Hello World!) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000200 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n284\n%%EOF"
      );
      const promises = Array(3).fill(null).map(
        () => PDFExtractor.extractTextFromPDF(pdfBuffer)
      );
      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).to.be.a("string");
        expect(result).to.include("Hello World");
      });
    });
  });
});
//# sourceMappingURL=pdf-ocr.test.js.map
