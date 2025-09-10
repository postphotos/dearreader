
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

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import dotenv from "dotenv";
dotenv.config();
function loadYamlConfig() {
  try {
    const projectRoot = process.cwd().endsWith("/js") ? path.resolve(process.cwd(), "..") : process.cwd();
    const cfgPath = path.resolve(projectRoot, "config.yaml");
    const raw = fs.readFileSync(cfgPath, "utf8");
    const mainConfig = yaml.load(raw);
    let pipelineConfig = {};
    try {
      const pipelinePath = path.resolve(projectRoot, "crawl_pipeline.yaml");
      const pipelineRaw = fs.readFileSync(pipelinePath, "utf8");
      pipelineConfig = yaml.load(pipelineRaw) || {};
    } catch (err) {
      console.log("crawl_pipeline.yaml not found, using config.yaml only");
    }
    const merged = { ...pipelineConfig, ...mainConfig };
    return substituteEnvVars(merged) || {};
  } catch (err) {
    console.error("Failed to load config files:", err instanceof Error ? err.message : String(err));
    return {};
  }
}
function substituteEnvVars(obj) {
  if (typeof obj === "string") {
    return obj.replace(/\$\{([^}]+)\}/g, (match, varExpr) => {
      const [varName, defaultValue] = varExpr.split(":-");
      return process.env[varName] || defaultValue || match;
    });
  } else if (Array.isArray(obj)) {
    return obj.map(substituteEnvVars);
  } else if (obj && typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteEnvVars(value);
    }
    return result;
  }
  return obj;
}
const yamlCfg = loadYamlConfig();
function mergeProviderConfig(yamlConfig, envPrefix = "") {
  const envKey = envPrefix ? `${envPrefix}_API_KEY` : "";
  const envBaseUrl = envPrefix ? `${envPrefix}_BASE_URL` : "";
  const envModel = envPrefix ? `${envPrefix}_MODEL` : "";
  const envTemp = envPrefix ? `${envPrefix}_TEMPERATURE` : "";
  const envPrompt = envPrefix ? `${envPrefix}_PARSING_PROMPT` : "";
  const envMaxTokens = envPrefix ? `${envPrefix}_MAX_TOKENS` : "";
  const envTopP = envPrefix ? `${envPrefix}_TOP_P` : "";
  const envFreqPenalty = envPrefix ? `${envPrefix}_FREQUENCY_PENALTY` : "";
  const envPresPenalty = envPrefix ? `${envPrefix}_PRESENCE_PENALTY` : "";
  const envTimeout = envPrefix ? `${envPrefix}_REQUEST_TIMEOUT_MS` : "";
  const envRetries = envPrefix ? `${envPrefix}_MAX_RETRIES` : "";
  return {
    api_key: process.env[envKey] || yamlConfig?.api_key || "",
    base_url: process.env[envBaseUrl] || yamlConfig?.base_url || "",
    model: process.env[envModel] || yamlConfig?.model || "",
    temperature: Number(process.env[envTemp]) || yamlConfig?.temperature || 0.2,
    parsing_prompt: process.env[envPrompt] || yamlConfig?.parsing_prompt || "Extract structured data from the following text:",
    prompt_options: {
      max_tokens: Number(process.env[envMaxTokens]) || yamlConfig?.prompt_options?.max_tokens || 2048,
      top_p: Number(process.env[envTopP]) || yamlConfig?.prompt_options?.top_p || 1,
      frequency_penalty: Number(process.env[envFreqPenalty]) || yamlConfig?.prompt_options?.frequency_penalty || 0,
      presence_penalty: Number(process.env[envPresPenalty]) || yamlConfig?.prompt_options?.presence_penalty || 0
    },
    request_timeout_ms: Number(process.env[envTimeout]) || yamlConfig?.request_timeout_ms || 3e4,
    max_retries: Number(process.env[envRetries]) || yamlConfig?.max_retries || 2
  };
}
function loadAIProviders() {
  const providers = {};
  if (yamlCfg.ai_providers) {
    Object.entries(yamlCfg.ai_providers).forEach(([providerKey, yamlConfig]) => {
      providers[providerKey] = mergeProviderConfig(yamlConfig);
    });
  }
  if (Object.keys(providers).length === 0) {
    providers["openai-gpt-3.5-turbo"] = mergeProviderConfig(void 0, "OPENAI");
    providers["openrouter-gpt-4"] = mergeProviderConfig(void 0, "OPENROUTER");
    providers["gemini-pro"] = mergeProviderConfig(void 0, "GEMINI");
  }
  return providers;
}
const config = {
  url: yamlCfg.url || process.env.READER_BASE_URL || "http://localhost:3001/",
  base_path: {
    enabled: yamlCfg.base_path?.enabled ?? false,
    path: yamlCfg.base_path?.path || "/dearreader/"
  },
  ai_providers: loadAIProviders(),
  ai_tasks: yamlCfg.ai_tasks || {
    parse_pdf: "openai-gpt-3.5-turbo",
    parse_pdf_backup: "openrouter-gpt-4",
    validate_format: "openrouter-gpt-4",
    validate_format_backup: "openai-gpt-4",
    edit_crawl: "openrouter-claude",
    edit_crawl_backup: "gemini-pro",
    general_chat: "openai-gpt-3.5-turbo",
    general_chat_backup: "openrouter-gpt-4",
    code_analysis: "openrouter-gpt-4",
    code_analysis_backup: "openai-gpt-4",
    ocr_processing: "gemini-pro-vision",
    ocr_processing_backup: "openrouter-claude",
    sentiment_analysis: "openrouter-claude",
    sentiment_analysis_backup: "gemini-pro",
    content_classification: "openai-gpt-3.5-turbo",
    content_classification_backup: "openrouter-gpt-4",
    default: "openai-gpt-3.5-turbo",
    default_backup: "openrouter-gpt-4"
  },
  concurrency: {
    max_api_concurrency: Number(process.env.MAX_API_CONCURRENCY) || yamlCfg.concurrency && yamlCfg.concurrency.max_api_concurrency || 50,
    default_client_concurrency: Number(process.env.DEFAULT_CLIENT_CONCURRENCY) || yamlCfg.concurrency && yamlCfg.concurrency.default_client_concurrency || 5,
    max_queue_length_per_client: Number(process.env.MAX_QUEUE_LENGTH_PER_CLIENT) || yamlCfg.concurrency && yamlCfg.concurrency.max_queue_length_per_client || 20
  },
  ...yamlCfg
};
var config_default = config;
export {
  config_default as default
};
//# sourceMappingURL=config.js.map
