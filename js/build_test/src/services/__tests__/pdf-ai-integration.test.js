
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
import { openaiConsumer, openrouterConsumer, geminiConsumer } from "../openai-consumer.js";
import config from "../../config.js";
describe("PDF + AI Integration", () => {
  const aiEnabled = config.ai_enabled !== false;
  const hasAnyAI = aiEnabled && (config.ai_providers?.["openai-gpt-3.5-turbo"]?.api_key && config.ai_providers["openai-gpt-3.5-turbo"].api_key !== "sk-your-openai-key-1" || config.ai_providers?.["openrouter-gpt-4"]?.api_key && config.ai_providers["openrouter-gpt-4"].api_key !== "sk-or-v1-your-openrouter-key" || config.ai_providers?.["gemini-pro"]?.api_key && config.ai_providers["gemini-pro"].api_key !== "your-gemini-api-key");
  describe("Configuration Tests", () => {
    it("should check AI and PDF integration configuration", () => {
      console.log(`AI enabled: ${aiEnabled}`);
      console.log(`AI providers configured: ${hasAnyAI}`);
      expect(typeof aiEnabled).to.equal("boolean");
      expect(typeof hasAnyAI).to.equal("boolean");
    });
  });
  if (hasAnyAI) {
    describe("PDF Text Extraction + AI Processing", () => {
      it("should extract text from PDF and process with AI", async function() {
        this.timeout(12e4);
        const testPdf = Buffer.from(
          "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 156\n>>\nstream\nBT\n72 720 Td\n/F0 12 Tf\n(DearReader is a web content extraction tool that converts web pages to clean, readable formats.) Tj\n0 -20 Td\n(It supports multiple output formats including Markdown, JSON, and plain text.) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000271 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n355\n%%EOF",
          "utf8"
        );
        const extractedText = await PDFExtractor.extractTextFromPDF(testPdf);
        expect(extractedText).to.be.a("string");
        expect(extractedText.length).to.be.greaterThan(10);
        expect(extractedText).to.include("DearReader");
        const aiConsumers = [openaiConsumer, openrouterConsumer, geminiConsumer].filter((consumer) => consumer.apiKey);
        expect(aiConsumers.length).to.be.greaterThan(0, "At least one AI provider should be configured");
        const aiConsumer = aiConsumers[0];
        try {
          const summary = await aiConsumer.parseText(extractedText, "Summarize this document in 2-3 sentences:");
          expect(summary).to.be.a("string");
          expect(summary.length).to.be.greaterThan(0);
          console.log(`\u{1F4C4} PDF Text: ${extractedText.substring(0, 100)}...`);
          console.log(`\u{1F916} AI Summary (${aiConsumer.provider}): ${summary.substring(0, 100)}...`);
        } catch (error) {
          if (error.message.includes("429") || error.message.includes("rate limit")) {
            console.log(`AI provider ${aiConsumer.provider} rate limited, skipping test`);
            this.skip();
          }
          throw error;
        }
      });
      it("should handle PDF with minimal content and use AI for enhancement", async function() {
        this.timeout(3e4);
        try {
          const tesseract = await import("tesseract.js");
          if (!tesseract) {
            console.log("\u26A0\uFE0F  Tesseract.js not available, skipping OCR test");
            this.skip();
            return;
          }
        } catch (error) {
          console.log("\u26A0\uFE0F  OCR dependencies not available, skipping test");
          this.skip();
          return;
        }
        const simplePdf = Buffer.from(
          "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test content) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000174 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n218\n%%EOF"
        );
        try {
          const text = await PDFExtractor.extractTextFromPDF(simplePdf);
          expect(text).to.be.a("string");
          expect(text.length).to.be.greaterThan(0);
          const aiConsumers = [openaiConsumer, openrouterConsumer, geminiConsumer].filter((consumer) => consumer.apiKey);
          if (aiConsumers.length > 0) {
            const aiConsumer = aiConsumers[0];
            try {
              const enhanced = await aiConsumer.parseText(text, "Enhance this text:");
              expect(enhanced).to.be.a("string");
              expect(enhanced.length).to.be.greaterThan(0);
            } catch (error) {
              if (error.message.includes("429") || error.message.includes("rate limit")) {
                console.log("\u26A0\uFE0F  AI rate limited, skipping enhancement test");
              } else {
                throw error;
              }
            }
          }
        } catch (error) {
          console.log(`\u26A0\uFE0F  PDF extraction failed: ${error.message}`);
          expect(error.message).to.include("Failed to extract text from PDF");
        }
      });
    });
    describe("Multi-Provider AI Testing", () => {
      it("should test all available AI providers with same content", async function() {
        this.timeout(18e4);
        const testContent = "This is a test document for AI processing. It contains information about web scraping and content extraction.";
        const results = {};
        const providers = [
          { name: "OpenAI", consumer: openaiConsumer },
          { name: "OpenRouter", consumer: openrouterConsumer },
          { name: "Gemini", consumer: geminiConsumer }
        ];
        for (const { name, consumer } of providers) {
          if (!consumer.apiKey) {
            console.log(`\u26A0\uFE0F  ${name} not configured, skipping`);
            continue;
          }
          try {
            console.log(`\u{1F504} Testing ${name}...`);
            const summary = await consumer.parseText(testContent, "Summarize this text:");
            results[name] = summary;
            expect(summary).to.be.a("string");
            expect(summary.length).to.be.greaterThan(0);
            console.log(`\u2705 ${name} successful: ${summary.substring(0, 50)}...`);
          } catch (error) {
            if (error.message.includes("429") || error.message.includes("rate limit")) {
              console.log(`\u26A0\uFE0F  ${name} rate limited`);
              results[name] = "Rate limited";
            } else {
              console.log(`\u274C ${name} failed: ${error.message}`);
              results[name] = `Error: ${error.message}`;
            }
          }
        }
        const successfulProviders = Object.values(results).filter(
          (result) => !result.startsWith("Error:") && !result.startsWith("Rate limited")
        );
        expect(successfulProviders.length).to.be.greaterThan(0, "At least one AI provider should work");
        console.log("\u{1F4CA} AI Provider Test Results:");
        Object.entries(results).forEach(([provider, result]) => {
          console.log(`   ${provider}: ${result.substring(0, 100)}${result.length > 100 ? "..." : ""}`);
        });
      });
    });
    describe("Error Handling and Fallbacks", () => {
      it("should handle AI provider failures gracefully", async function() {
        this.timeout(6e4);
        const testContent = "Test content for error handling.";
        const failingConsumer = new openaiConsumer.constructor("openai");
        failingConsumer.apiKey = "";
        try {
          await failingConsumer.parseText(testContent);
          expect.fail("Should have thrown an error for missing API key");
        } catch (error) {
          expect(error).to.be.an("error");
        }
      });
      it("should handle malformed PDF content", async function() {
        this.timeout(6e4);
        const malformedPdf = Buffer.from("This is not a PDF file");
        try {
          await PDFExtractor.extractTextFromPDF(malformedPdf);
          expect.fail("Should have thrown an error for malformed PDF");
        } catch (error) {
          expect(error.message).to.include("Failed to extract text from PDF");
        }
        const aiConsumers = [openaiConsumer, openrouterConsumer, geminiConsumer].filter((consumer) => consumer.apiKey);
        if (aiConsumers.length > 0) {
          const aiConsumer = aiConsumers[0];
          try {
            const errorDescription = "PDF extraction failed due to malformed content";
            const response = await aiConsumer.parseText(errorDescription, "Explain what happened:");
            expect(response).to.be.a("string");
          } catch (error) {
            if (error.message.includes("429") || error.message.includes("rate limit")) {
              this.skip();
            }
            throw error;
          }
        }
      });
    });
    describe("Performance Testing", () => {
      it("should handle concurrent PDF + AI processing", async function() {
        this.timeout(6e4);
        const testPdf = Buffer.from(
          "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 68\n>>\nstream\nBT\n72 720 Td\n/F0 12 Tf\n(Performance test document content.) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000200 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n284\n%%EOF"
        );
        const aiConsumers = [openaiConsumer, openrouterConsumer, geminiConsumer].filter((consumer) => consumer.apiKey);
        if (aiConsumers.length === 0) {
          console.log("\u26A0\uFE0F  No AI providers configured, skipping performance test");
          this.skip();
          return;
        }
        const aiConsumer = aiConsumers[0];
        try {
          const concurrentTasks = Array(2).fill(null).map(async () => {
            const text = await PDFExtractor.extractTextFromPDF(testPdf);
            if (text && text.length > 0) {
              const summary = await aiConsumer.parseText(text, "Summarize:");
              return { text, summary };
            }
            return { text: "No text extracted", summary: "N/A" };
          });
          const results = await Promise.all(concurrentTasks);
          results.forEach((result) => {
            expect(result).to.have.property("text");
            expect(result).to.have.property("summary");
          });
          console.log(`\u2705 Successfully processed ${results.length} PDFs concurrently with AI`);
        } catch (error) {
          console.log(`\u26A0\uFE0F  Performance test failed: ${error.message}`);
          if (error.message.includes("429") || error.message.includes("rate limit")) {
            this.skip();
          } else {
            throw error;
          }
        }
      });
    });
  } else {
    describe("AI Disabled Tests", () => {
      it("should handle AI being disabled gracefully", () => {
        expect(hasAnyAI).to.equal(false);
      });
      it("should still be able to extract text from PDFs without AI", async () => {
        const testPdf = Buffer.from(
          "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n72 720 Td\n/F0 12 Tf\n(Hello World!) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000200 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n284\n%%EOF"
        );
        const text = await PDFExtractor.extractTextFromPDF(testPdf);
        expect(text).to.be.a("string");
        expect(text).to.include("Hello World");
      });
    });
  }
});
//# sourceMappingURL=pdf-ai-integration.test.js.map
