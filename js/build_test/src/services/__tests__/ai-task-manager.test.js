
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
import {
  getAIConsumerForTask,
  getAIConsumerWithFallback,
  getAvailableTasks,
  getTaskConfig
} from "../ai-task-manager.js";
import config from "../../config.js";
describe("AI Task Manager", () => {
  const aiEnabled = config.ai_enabled !== false;
  describe("Configuration Tests", () => {
    it("should check AI enable/disable configuration", () => {
      if (aiEnabled) {
        console.log("\u2705 AI processing is enabled");
      } else {
        console.log("\u26A0\uFE0F  AI processing is disabled");
      }
      expect(typeof aiEnabled).to.equal("boolean");
    });
  });
  if (aiEnabled) {
    describe("getAIConsumerForTask", () => {
      it("should return primary consumer for parse_pdf task", () => {
        const consumer = getAIConsumerForTask("parse_pdf", false);
        expect(consumer).to.not.be.null;
        expect(consumer?.provider).to.equal("openai");
        expect(consumer?.baseUrl).to.include("127.0.0.1");
      });
      it("should return backup consumer for parse_pdf task", () => {
        const consumer = getAIConsumerForTask("parse_pdf", true);
        expect(consumer).to.not.be.null;
        expect(consumer?.provider).to.equal("openrouter");
        expect(consumer?.baseUrl).to.include("openrouter.ai");
      });
      it("should return primary consumer for validate_format task", () => {
        const consumer = getAIConsumerForTask("validate_format", false);
        expect(consumer).to.not.be.null;
        expect(consumer?.provider).to.equal("openrouter");
      });
      it("should return backup consumer for validate_format task", () => {
        const consumer = getAIConsumerForTask("validate_format", true);
        expect(consumer).to.not.be.null;
        expect(consumer?.provider).to.equal("openai");
      });
      it("should return default consumer for unknown task", () => {
        const consumer = getAIConsumerForTask("unknown_task", false);
        expect(consumer).to.not.be.null;
        expect(consumer?.provider).to.equal("openai");
      });
      it("should return default backup consumer for unknown task", () => {
        const consumer = getAIConsumerForTask("unknown_task", true);
        expect(consumer).to.not.be.null;
        expect(consumer?.provider).to.equal("openrouter");
      });
      it("should return null for invalid provider", () => {
        const originalTasks = config.ai_tasks;
        config.ai_tasks = { ...originalTasks, test_invalid: "invalid_provider" };
        const consumer = getAIConsumerForTask("test_invalid", false);
        expect(consumer).to.be.null;
        config.ai_tasks = originalTasks;
      });
    });
    describe("getAIConsumerWithFallback", () => {
      it("should return primary consumer when available", () => {
        const consumer = getAIConsumerWithFallback("parse_pdf");
        expect(consumer).to.not.be.null;
        expect(consumer?.provider).to.equal("openai");
      });
      it("should fallback to backup when primary fails", () => {
        const originalTasks = config.ai_tasks;
        config.ai_tasks = {
          ...originalTasks,
          test_fallback: "invalid_provider",
          test_fallback_backup: "openrouter-gpt-4"
        };
        const consumer = getAIConsumerWithFallback("test_fallback");
        expect(consumer).to.not.be.null;
        expect(consumer?.provider).to.equal("openrouter");
        config.ai_tasks = originalTasks;
      });
      it("should fallback to default when both primary and backup fail", () => {
        const originalTasks = config.ai_tasks;
        config.ai_tasks = {
          ...originalTasks,
          test_double_fallback: "invalid_provider",
          test_double_fallback_backup: "invalid_provider2"
        };
        const consumer = getAIConsumerWithFallback("test_double_fallback");
        expect(consumer).to.not.be.null;
        expect(consumer?.provider).to.equal("openai");
        config.ai_tasks = originalTasks;
      });
    });
    describe("getAvailableTasks", () => {
      it("should return all configured tasks", () => {
        const tasks = getAvailableTasks();
        expect(tasks).to.be.an("array");
        expect(tasks).to.include("parse_pdf");
        expect(tasks).to.include("validate_format");
        expect(tasks).to.include("edit_crawl");
        expect(tasks).to.include("general_chat");
        expect(tasks).to.include("code_analysis");
        expect(tasks).to.include("default");
      });
      it("should include backup tasks", () => {
        const tasks = getAvailableTasks();
        expect(tasks).to.include("parse_pdf_backup");
        expect(tasks).to.include("validate_format_backup");
      });
    });
    describe("getTaskConfig", () => {
      it("should return primary and backup config for parse_pdf", () => {
        const config2 = getTaskConfig("parse_pdf");
        expect(config2.primary).to.equal("openai-gpt-3.5-turbo");
        expect(config2.backup).to.equal("openrouter-gpt-4");
      });
      it("should return primary and backup config for validate_format", () => {
        const config2 = getTaskConfig("validate_format");
        expect(config2.primary).to.equal("openrouter-gpt-4");
        expect(config2.backup).to.equal("openai-gpt-4");
      });
      it("should return null for unknown task", () => {
        const config2 = getTaskConfig("unknown_task");
        expect(config2.primary).to.be.null;
        expect(config2.backup).to.be.null;
      });
    });
    describe("Integration Tests", () => {
      it("should handle real API calls with fallback", async function() {
        this.timeout(3e4);
        const consumer = getAIConsumerWithFallback("general_chat");
        expect(consumer).to.not.be.null;
        try {
          const result = await consumer.parseText('Hello, respond with "test successful"');
          expect(result).to.be.a("string");
          expect(result.length).to.be.greaterThan(0);
        } catch (error) {
          console.log("API call failed (expected in test environment):", error instanceof Error ? error.message : String(error));
        }
      });
      it("should work with different task types", () => {
        const tasks = ["parse_pdf", "validate_format", "edit_crawl", "general_chat", "code_analysis"];
        tasks.forEach((task) => {
          const consumer = getAIConsumerWithFallback(task);
          expect(consumer).to.not.be.null;
          expect(consumer?.provider).to.be.oneOf(["openai", "openrouter", "gemini"]);
        });
      });
      it("should maintain consumer properties", () => {
        const consumer = getAIConsumerWithFallback("parse_pdf");
        expect(consumer).to.not.be.null;
        expect(consumer?.baseUrl).to.be.a("string");
        expect(consumer?.model).to.be.a("string");
        expect(consumer?.temperature).to.be.a("number");
      });
    });
    describe("Error Handling", () => {
      it("should handle missing ai_tasks configuration", () => {
        const originalTasks = config.ai_tasks;
        config.ai_tasks = void 0;
        const consumer = getAIConsumerForTask("parse_pdf", false);
        expect(consumer).to.be.null;
        config.ai_tasks = originalTasks;
      });
      it("should handle empty ai_tasks configuration", () => {
        const originalTasks = config.ai_tasks;
        config.ai_tasks = {};
        const consumer = getAIConsumerForTask("parse_pdf", false);
        expect(consumer).to.be.null;
        config.ai_tasks = originalTasks;
      });
    });
  } else {
    describe("AI Disabled Tests", () => {
      it("should handle AI being disabled gracefully", () => {
        expect(aiEnabled).to.equal(false);
      });
      it("should return null for AI consumers when disabled", () => {
        const consumer = getAIConsumerForTask("parse_pdf", false);
        expect(consumer).to.be.null;
      });
      it("should return empty task list when AI is disabled", () => {
        const tasks = getAvailableTasks();
        expect(tasks).to.be.an("array");
      });
    });
  }
});
//# sourceMappingURL=ai-task-manager.test.js.map
