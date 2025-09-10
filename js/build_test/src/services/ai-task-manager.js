
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

import config from "../config.js";
import { AIConsumer } from "./openai-consumer.js";
function getAIConsumerForTask(taskName, useBackup = false) {
  const taskKey = useBackup ? `${taskName}_backup` : taskName;
  const providerName = config.ai_tasks?.[taskKey] || config.ai_tasks?.[useBackup ? "default_backup" : "default"];
  if (!providerName || !config.ai_providers?.[providerName]) {
    console.warn(`No AI provider configured for task: ${taskName} (using ${useBackup ? "backup" : "primary"})`);
    return null;
  }
  try {
    return new AIConsumer(providerName);
  } catch (error) {
    console.error(`Failed to create AI consumer for provider ${providerName}:`, error);
    return null;
  }
}
function getAIConsumerWithFallback(taskName) {
  let consumer = getAIConsumerForTask(taskName, false);
  if (consumer) {
    return consumer;
  }
  consumer = getAIConsumerForTask(taskName, true);
  if (consumer) {
    console.log(`Using backup AI provider for task: ${taskName}`);
    return consumer;
  }
  consumer = getAIConsumerForTask("default", false);
  if (consumer) {
    console.log(`Using default AI provider for task: ${taskName}`);
    return consumer;
  }
  consumer = getAIConsumerForTask("default", true);
  if (consumer) {
    console.log(`Using default backup AI provider for task: ${taskName}`);
    return consumer;
  }
  console.error(`No AI providers available for task: ${taskName}`);
  return null;
}
function getAvailableTasks() {
  return Object.keys(config.ai_tasks || {});
}
function getTaskConfig(taskName) {
  const primary = config.ai_tasks?.[taskName] || null;
  const backup = config.ai_tasks?.[`${taskName}_backup`] || null;
  return { primary, backup };
}
export {
  getAIConsumerForTask,
  getAIConsumerWithFallback,
  getAvailableTasks,
  getTaskConfig
};
//# sourceMappingURL=ai-task-manager.js.map
