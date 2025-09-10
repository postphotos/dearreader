
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

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};
import { singleton } from "tsyringe";
let QueueManager = class {
  constructor(logger) {
    this.logger = logger;
    this.queue = [];
    this.maxSize = 1e3;
    this.maxConcurrent = 10;
    this.activeTasks = 0;
    // Statistics
    this.totalRequests = 0;
    this.completedRequests = 0;
    this.failedRequests = 0;
    // Keep track of all tasks for retrieval
    this.allTasks = /* @__PURE__ */ new Map();
  }
  async enqueue(task) {
    if (this.queue.length >= this.maxSize) {
      throw new Error("Queue is full");
    }
    const queueTask = {
      ...task,
      id: this.generateId(),
      timestamp: Date.now(),
      status: "pending"
    };
    this.queue.push(queueTask);
    this.totalRequests++;
    this.allTasks.set(queueTask.id, queueTask);
    this.logger.info(`Task enqueued: ${queueTask.id} for ${queueTask.url}`);
    return queueTask.id;
  }
  async dequeue() {
    if (this.queue.length === 0 || this.activeTasks >= this.maxConcurrent) {
      return null;
    }
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });
    const task = this.queue.shift();
    task.status = "processing";
    this.activeTasks++;
    this.logger.info(`Task dequeued: ${task.id}`);
    return task;
  }
  completeTask(taskId, result) {
    const task = this.allTasks.get(taskId);
    if (task) {
      task.status = "completed";
      task.result = result;
      this.activeTasks--;
      this.completedRequests++;
      this.logger.info(`Task completed: ${taskId}`);
    }
  }
  failTask(taskId, error) {
    const task = this.allTasks.get(taskId);
    if (task) {
      task.status = "failed";
      task.error = error;
      this.activeTasks--;
      this.failedRequests++;
      this.logger.error(`Task failed: ${taskId} - ${error}`);
    }
  }
  getTask(taskId) {
    return this.allTasks.get(taskId);
  }
  getStatistics() {
    return {
      total_requests: this.totalRequests,
      active_requests: this.activeTasks,
      pending_requests: this.queue.length,
      completed_requests: this.completedRequests,
      failed_requests: this.failedRequests,
      max_concurrent: this.maxConcurrent
    };
  }
  getAllTasks() {
    return [...this.queue];
  }
  clear() {
    this.queue.length = 0;
    this.activeTasks = 0;
    this.logger.info("Queue cleared");
  }
  findTask(taskId) {
    return this.queue.find((task) => task.id === taskId);
  }
  generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};
QueueManager = __decorateClass([
  singleton()
], QueueManager);
export {
  QueueManager
};
//# sourceMappingURL=queue-manager.js.map
