
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
import { setTimeout as delay } from "timers/promises";
class AIConsumer {
  constructor(providerKey = "openai-gpt-3.5-turbo") {
    this.providerKey = providerKey;
    this.provider = this.extractProviderFromKey(providerKey);
    const providerConfig = config.ai_providers?.[providerKey];
    if (!providerConfig) {
      throw new Error(`AI provider '${providerKey}' not configured in config.yaml`);
    }
    this.baseUrl = (providerConfig.base_url || this.getDefaultBaseUrl(this.provider)).replace(/\/$/, "");
    this.apiKey = providerConfig.api_key || this.getEnvApiKey(this.provider) || "";
    this.model = providerConfig.model || this.getDefaultModel(this.provider);
    this.temperature = providerConfig.temperature ?? 0.2;
    this.parsingPrompt = providerConfig.parsing_prompt || "Extract structured data from the following text:";
    this.promptOptions = providerConfig.prompt_options || {};
    this.timeoutMs = providerConfig.request_timeout_ms || 3e4;
    this.maxRetries = providerConfig.max_retries ?? 2;
  }
  extractProviderFromKey(providerKey) {
    if (providerKey.startsWith("openai-")) {
      return "openai";
    } else if (providerKey.startsWith("openrouter-")) {
      return "openrouter";
    } else if (providerKey.startsWith("gemini-")) {
      return "gemini";
    } else {
      const parts = providerKey.split("-");
      if (parts.length > 0) {
        const baseProvider = parts[0];
        if (["openai", "openrouter", "gemini"].includes(baseProvider)) {
          return baseProvider;
        }
      }
      return "openai";
    }
  }
  getDefaultBaseUrl(provider) {
    switch (provider) {
      case "openai":
        return "https://api.openai.com/v1";
      case "openrouter":
        return "https://openrouter.ai/api/v1";
      case "gemini":
        return "https://generativelanguage.googleapis.com/v1";
      default:
        return "https://api.openai.com/v1";
    }
  }
  getEnvApiKey(provider) {
    switch (provider) {
      case "openai":
        return process.env.OPENAI_API_KEY || "";
      case "openrouter":
        return process.env.OPENROUTER_API_KEY || "";
      case "gemini":
        return process.env.GEMINI_API_KEY || "";
      default:
        return "";
    }
  }
  getDefaultModel(provider) {
    switch (provider) {
      case "openai":
        return "gpt-3.5-turbo";
      case "openrouter":
        return "openrouter/gpt-4";
      case "gemini":
        return "gemini-pro";
      default:
        return "gpt-3.5-turbo";
    }
  }
  headers() {
    const h = { "Content-Type": "application/json" };
    if (this.apiKey) {
      if (this.provider === "gemini") {
      } else {
        h["Authorization"] = `Bearer ${this.apiKey}`;
      }
    }
    return h;
  }
  buildRequestBody(messages, model, opts = {}) {
    const requestModel = model || this.model;
    const requestOpts = { ...this.promptOptions, ...opts };
    if (this.provider === "gemini") {
      return {
        contents: messages.map((msg) => ({
          parts: [{ text: msg.content }],
          role: msg.role === "assistant" ? "model" : "user"
        })),
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: requestOpts.max_tokens,
          topP: requestOpts.top_p
        }
      };
    } else {
      return {
        model: requestModel,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: this.temperature,
        ...requestOpts
      };
    }
  }
  buildUrl(endpoint) {
    if (this.provider === "gemini") {
      return `${this.baseUrl}/models/${this.model}:${endpoint}?key=${this.apiKey}`;
    } else {
      return `${this.baseUrl}/${endpoint}`;
    }
  }
  async fetchWithRetry(url, opts, retriesLeft = this.maxRetries) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (retriesLeft > 0 && (res.status === 429 || res.status >= 500)) {
          await delay(1e3);
          return this.fetchWithRetry(url, opts, retriesLeft - 1);
        }
        throw new Error(`${this.provider} request failed ${res.status}: ${body}`);
      }
      return res.json();
    } catch (err) {
      if (retriesLeft > 0) {
        await delay(1e3);
        return this.fetchWithRetry(url, opts, retriesLeft - 1);
      }
      throw err;
    }
  }
  async createChatCompletion(messages, model, opts = {}) {
    const endpoint = this.provider === "gemini" ? "generateContent" : "chat/completions";
    const url = this.buildUrl(endpoint);
    const body = this.buildRequestBody(messages, model, opts);
    return this.fetchWithRetry(url, { method: "POST", headers: this.headers(), body: JSON.stringify(body) });
  }
  async parseText(text, customPrompt) {
    const prompt = customPrompt || this.parsingPrompt;
    const messages = [
      { role: "system", content: prompt },
      { role: "user", content: text }
    ];
    try {
      const response = await this.createChatCompletion(messages);
      if (this.provider === "gemini") {
        return response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        return response.choices?.[0]?.message?.content || "";
      }
    } catch (error) {
      console.error(`Error parsing text with ${this.provider}:`, error);
      throw error;
    }
  }
}
class OpenAIConsumer extends AIConsumer {
  constructor() {
    super("openai-gpt-3.5-turbo");
  }
}
const openaiConsumer = new OpenAIConsumer();
const openrouterConsumer = new AIConsumer("openrouter-gpt-4");
const geminiConsumer = new AIConsumer("gemini-pro");
export {
  AIConsumer,
  OpenAIConsumer,
  geminiConsumer,
  openaiConsumer,
  openrouterConsumer
};
//# sourceMappingURL=openai-consumer.js.map
