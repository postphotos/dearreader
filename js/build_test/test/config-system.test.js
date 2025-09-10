
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
import fs from "fs";
import path from "path";
import os from "os";
import config from "../src/config.js";
describe("Configuration System", () => {
  let tempDir;
  let originalCwd;
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dearreader-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });
  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  describe("Environment Variable Loading", () => {
    it("should load API keys from .env file", () => {
      const envContent = `OPENAI_API_KEY=test-openai-key
OPENROUTER_API_KEY=test-openrouter-key
GEMINI_API_KEY=test-gemini-key
PINECONE_API_KEY=test-pinecone-key`;
      fs.writeFileSync(".env", envContent);
      fs.writeFileSync("config.yaml", "ai_enabled: true\n");
      fs.writeFileSync("crawl_pipeline.yaml", `llm_providers:
  openai-gpt-3.5-turbo:
    api_key: "\${OPENAI_API_KEY}"
    model: "gpt-3.5-turbo"
    rpm_limit: 3500
  openrouter-gpt-4:
    api_key: "\${OPENROUTER_API_KEY}"
    model: "openai/gpt-4"
    rpm_limit: 100`);
      const testConfig = config;
      expect(testConfig.ai_providers?.["openai-gpt-3.5-turbo"]?.api_key).to.equal("test-openai-key");
      expect(testConfig.ai_providers?.["openrouter-gpt-4"]?.api_key).to.equal("test-openrouter-key");
    });
    it("should handle missing .env file gracefully", () => {
      fs.writeFileSync("config.yaml", "ai_enabled: false\n");
      fs.writeFileSync("crawl_pipeline.yaml", "llm_providers: {}");
      const testConfig = config;
      expect(testConfig.ai_enabled).to.equal(false);
      expect(Object.keys(testConfig.ai_providers || {})).to.have.lengthOf(0);
    });
  });
  describe("Configuration File Structure", () => {
    it("should load config.yaml settings", () => {
      fs.writeFileSync("config.yaml", `ai_enabled: true
performance:
  max_concurrent_pages: 5
  max_rps: 30
concurrency:
  max_api_concurrency: 25`);
      const testConfig = config;
      expect(testConfig.ai_enabled).to.equal(true);
      expect(testConfig.performance.max_concurrent_pages).to.equal(5);
      expect(testConfig.performance.max_rps).to.equal(30);
      expect(testConfig.concurrency?.max_api_concurrency).to.equal(25);
    });
    it("should load crawl_pipeline.yaml AI configurations", () => {
      fs.writeFileSync("config.yaml", "ai_enabled: true\n");
      fs.writeFileSync("crawl_pipeline.yaml", `llm_providers:
  test-provider:
    api_key: "test-key"
    model: "test-model"
    temperature: 0.5
    rpm_limit: 100
    max_tokens: 1024
ai_tasks:
  test_task: "test-provider"`);
      const testConfig = config;
      expect(testConfig.ai_providers?.["test-provider"]).to.be.an("object");
      expect(testConfig.ai_providers?.["test-provider"]?.api_key).to.equal("test-key");
      expect(testConfig.ai_providers?.["test-provider"]?.model).to.equal("test-model");
      expect(testConfig.ai_providers?.["test-provider"]?.temperature).to.equal(0.5);
      expect(testConfig.ai_providers?.["test-provider"]?.rpm_limit).to.equal(100);
      expect(testConfig.ai_tasks?.test_task).to.equal("test-provider");
    });
    it("should merge config.yaml and crawl_pipeline.yaml correctly", () => {
      fs.writeFileSync("config.yaml", `ai_enabled: true
performance:
  max_concurrent_pages: 10`);
      fs.writeFileSync("crawl_pipeline.yaml", `llm_providers:
  merged-provider:
    api_key: "merged-key"
    model: "merged-model"
performance:
  max_rps: 50`);
      const testConfig = config;
      expect(testConfig.ai_enabled).to.equal(true);
      expect(testConfig.performance.max_concurrent_pages).to.equal(10);
      expect(testConfig.performance.max_rps).to.equal(50);
      expect(testConfig.ai_providers?.["merged-provider"]?.api_key).to.equal("merged-key");
    });
  });
  describe("RPM Limits", () => {
    it("should load RPM limits from crawl_pipeline.yaml", () => {
      fs.writeFileSync("config.yaml", "ai_enabled: true\n");
      fs.writeFileSync("crawl_pipeline.yaml", `llm_providers:
  openai-gpt-3.5-turbo:
    api_key: "test-key"
    rpm_limit: 3500
  openai-gpt-4:
    api_key: "test-key"
    rpm_limit: 200
  gemini-pro:
    api_key: "test-key"
    rpm_limit: 60`);
      const testConfig = config;
      expect(testConfig.ai_providers?.["openai-gpt-3.5-turbo"]?.rpm_limit).to.equal(3500);
      expect(testConfig.ai_providers?.["openai-gpt-4"]?.rpm_limit).to.equal(200);
      expect(testConfig.ai_providers?.["gemini-pro"]?.rpm_limit).to.equal(60);
    });
  });
  describe("Environment Variable Substitution", () => {
    it("should substitute environment variables in YAML", () => {
      process.env.TEST_API_KEY = "substituted-key";
      process.env.TEST_BASE_URL = "https://test.example.com";
      fs.writeFileSync("config.yaml", "ai_enabled: true\n");
      fs.writeFileSync("crawl_pipeline.yaml", `llm_providers:
  test-provider:
    api_key: "\${TEST_API_KEY}"
    base_url: "\${TEST_BASE_URL}"
    model: "test-model"`);
      const testConfig = config;
      expect(testConfig.ai_providers?.["test-provider"]?.api_key).to.equal("substituted-key");
      expect(testConfig.ai_providers?.["test-provider"]?.base_url).to.equal("https://test.example.com");
      delete process.env.TEST_API_KEY;
      delete process.env.TEST_BASE_URL;
    });
    it("should handle default values in environment variable substitution", () => {
      fs.writeFileSync("config.yaml", "ai_enabled: true\n");
      fs.writeFileSync("crawl_pipeline.yaml", `llm_providers:
  test-provider:
    api_key: "\${MISSING_VAR:-default-key}"
    base_url: "\${MISSING_URL:-https://default.example.com}"`);
      const testConfig = config;
      expect(testConfig.ai_providers?.["test-provider"]?.api_key).to.equal("default-key");
      expect(testConfig.ai_providers?.["test-provider"]?.base_url).to.equal("https://default.example.com");
    });
  });
});
//# sourceMappingURL=config-system.test.js.map
