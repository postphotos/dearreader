
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

import "reflect-metadata";
import { expect } from "chai";
import { QueueManager } from "../queue-manager.js";
describe("QueueManager", () => {
  let queueManager;
  let mockLogger;
  beforeEach(() => {
    mockLogger = {
      info: () => {
      },
      error: () => {
      },
      warn: () => {
      },
      debug: () => {
      }
    };
    queueManager = new QueueManager(mockLogger);
  });
  describe("Basic Queue Operations", () => {
    it("should initialize with empty queue", () => {
      expect(queueManager.getAllTasks()).to.be.an("array").that.is.empty;
      const stats = queueManager.getStatistics();
      expect(stats.total_requests).to.equal(0);
      expect(stats.active_requests).to.equal(0);
      expect(stats.pending_requests).to.equal(0);
    });
    it("should enqueue tasks correctly", async () => {
      const taskId = await queueManager.enqueue({
        url: "https://example.com",
        priority: 1
      });
      expect(taskId).to.be.a("string");
      expect(queueManager.getAllTasks()).to.have.lengthOf(1);
      const task = queueManager.getTask(taskId);
      expect(task).to.exist;
      expect(task.url).to.equal("https://example.com");
      expect(task.priority).to.equal(1);
      expect(task.status).to.equal("pending");
    });
    it("should dequeue tasks in priority order", async () => {
      const taskId1 = await queueManager.enqueue({ url: "https://low.com", priority: 1 });
      const taskId2 = await queueManager.enqueue({ url: "https://high.com", priority: 5 });
      const taskId3 = await queueManager.enqueue({ url: "https://medium.com", priority: 3 });
      const dequeuedTask = await queueManager.dequeue();
      expect(dequeuedTask).to.exist;
      expect(dequeuedTask.url).to.equal("https://high.com");
      expect(dequeuedTask.status).to.equal("processing");
    });
    it("should handle task completion", async () => {
      const taskId = await queueManager.enqueue({
        url: "https://example.com",
        priority: 1
      });
      const task = await queueManager.dequeue();
      expect(task.status).to.equal("processing");
      queueManager.completeTask(taskId, { result: "success" });
      const completedTask = queueManager.getTask(taskId);
      expect(completedTask.status).to.equal("completed");
      expect(completedTask.result).to.deep.equal({ result: "success" });
      const stats = queueManager.getStatistics();
      expect(stats.completed_requests).to.equal(1);
    });
    it("should handle task failure", async () => {
      const taskId = await queueManager.enqueue({
        url: "https://example.com",
        priority: 1
      });
      const task = await queueManager.dequeue();
      expect(task.status).to.equal("processing");
      queueManager.failTask(taskId, "Network error");
      const failedTask = queueManager.getTask(taskId);
      expect(failedTask.status).to.equal("failed");
      expect(failedTask.error).to.equal("Network error");
      const stats = queueManager.getStatistics();
      expect(stats.failed_requests).to.equal(1);
    });
  });
  describe("Queue Limits", () => {
    it("should reject tasks when queue is full", async () => {
      const maxSize = 1e3;
      for (let i = 0; i < maxSize; i++) {
        await queueManager.enqueue({
          url: `https://example${i}.com`,
          priority: 1
        });
      }
      try {
        await queueManager.enqueue({
          url: "https://overflow.com",
          priority: 1
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.equal("Queue is full");
      }
    });
    it("should not dequeue when at max concurrent limit", async () => {
      queueManager.activeTasks = 10;
      await queueManager.enqueue({
        url: "https://example.com",
        priority: 1
      });
      const task = await queueManager.dequeue();
      expect(task).to.be.null;
    });
  });
  describe("Statistics", () => {
    it("should track statistics correctly", async () => {
      const taskId1 = await queueManager.enqueue({
        url: "https://example.com",
        priority: 1
      });
      let stats = queueManager.getStatistics();
      expect(stats.total_requests).to.equal(1);
      expect(stats.pending_requests).to.equal(1);
      const task = await queueManager.dequeue();
      queueManager.completeTask(taskId1);
      stats = queueManager.getStatistics();
      expect(stats.completed_requests).to.equal(1);
      expect(stats.pending_requests).to.equal(0);
    });
    it("should provide comprehensive statistics", () => {
      const stats = queueManager.getStatistics();
      expect(stats).to.have.property("total_requests");
      expect(stats).to.have.property("active_requests");
      expect(stats).to.have.property("pending_requests");
      expect(stats).to.have.property("completed_requests");
      expect(stats).to.have.property("failed_requests");
      expect(stats).to.have.property("max_concurrent");
    });
  });
  describe("Queue Management", () => {
    it("should clear the queue", async () => {
      await queueManager.enqueue({ url: "https://example.com", priority: 1 });
      await queueManager.enqueue({ url: "https://test.com", priority: 1 });
      expect(queueManager.getAllTasks()).to.have.lengthOf(2);
      queueManager.clear();
      expect(queueManager.getAllTasks()).to.have.lengthOf(0);
    });
    it("should retrieve tasks by ID", async () => {
      const taskId = await queueManager.enqueue({
        url: "https://example.com",
        priority: 1
      });
      const task = queueManager.getTask(taskId);
      expect(task).to.exist;
      expect(task.id).to.equal(taskId);
      const nonExistentTask = queueManager.getTask("non-existent");
      expect(nonExistentTask).to.be.undefined;
    });
  });
});
//# sourceMappingURL=queue-manager.test.js.map
