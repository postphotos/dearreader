import config from '../config.js';
import { setTimeout as delay } from 'timers/promises';
export class AIConsumer {
    constructor(providerKey = 'openai-gpt-3.5-turbo') {
        this.providerKey = providerKey;
        this.provider = this.extractProviderFromKey(providerKey);
        const providerConfig = config.ai_providers?.[providerKey];
        if (!providerConfig) {
            // In test environments or when config is not yet loaded, use defaults
            console.warn(`AI provider '${providerKey}' not configured, using defaults`);
            this.baseUrl = this.getDefaultBaseUrl(this.provider);
            this.apiKey = this.getEnvApiKey(this.provider) || '';
            this.model = this.getDefaultModel(this.provider);
            this.temperature = 0.2;
            this.parsingPrompt = 'Extract structured data from the following text:';
            this.promptOptions = {};
            this.timeoutMs = 30000;
            this.maxRetries = 2;
            return;
        }
        this.baseUrl = (providerConfig.base_url || this.getDefaultBaseUrl(this.provider)).replace(/\/$/, '');
        this.apiKey = providerConfig.api_key || this.getEnvApiKey(this.provider) || '';
        this.model = providerConfig.model || this.getDefaultModel(this.provider);
        this.temperature = providerConfig.temperature ?? 0.2;
        this.parsingPrompt = providerConfig.parsing_prompt || 'Extract structured data from the following text:';
        this.promptOptions = providerConfig.prompt_options || {};
        this.timeoutMs = providerConfig.request_timeout_ms || 30000;
        this.maxRetries = providerConfig.max_retries ?? 2;
    }
    extractProviderFromKey(providerKey) {
        // Handle new OpenRouter format with slashes (e.g., "deepseek/deepseek-r1:free")
        if (providerKey.includes('/')) {
            const providerPart = providerKey.split('/')[0];
            if (providerPart === 'deepseek' || providerPart === 'meta-llama' || providerPart === 'qwen' || providerPart === 'google' || providerPart === 'mistralai') {
                return 'openrouter'; // All these are accessed via OpenRouter
            }
        }
        // Handle legacy format with dashes
        if (providerKey.startsWith('openai-')) {
            return 'openai';
        }
        else if (providerKey.startsWith('openrouter-')) {
            return 'openrouter';
        }
        else if (providerKey.startsWith('gemini-')) {
            return 'gemini';
        }
        else {
            // Fallback: try to extract from the key
            const parts = providerKey.split('-');
            if (parts.length > 0) {
                const baseProvider = parts[0];
                if (['openai', 'openrouter', 'gemini'].includes(baseProvider)) {
                    return baseProvider;
                }
            }
            return 'openrouter'; // Default to openrouter for new format
        }
    }
    getDefaultBaseUrl(provider) {
        switch (provider) {
            case 'openai': return 'https://api.openai.com/v1';
            case 'openrouter': return 'https://openrouter.ai/api/v1';
            case 'gemini': return 'https://generativelanguage.googleapis.com/v1';
            default: return 'https://api.openai.com/v1';
        }
    }
    getEnvApiKey(provider) {
        switch (provider) {
            case 'openai': return process.env.OPENAI_API_KEY || '';
            case 'openrouter': return process.env.OPENROUTER_API_KEY || '';
            case 'gemini': return process.env.GEMINI_API_KEY || '';
            default: return '';
        }
    }
    getDefaultModel(provider) {
        switch (provider) {
            case 'openai': return 'gpt-3.5-turbo';
            case 'openrouter': return 'openai/gpt-4'; // Default OpenRouter model
            case 'gemini': return 'gemini-pro';
            default: return 'openai/gpt-4'; // Default to OpenRouter format
        }
    }
    headers() {
        const h = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
            if (this.provider === 'gemini') {
                // Gemini uses query parameter for API key
            }
            else {
                h['Authorization'] = `Bearer ${this.apiKey}`;
            }
        }
        return h;
    }
    buildRequestBody(messages, model, opts = {}) {
        const requestModel = model || this.model;
        const requestOpts = { ...this.promptOptions, ...opts };
        if (this.provider === 'gemini') {
            // Gemini has a different API structure
            return {
                contents: messages.map(msg => ({
                    parts: [{ text: msg.content }],
                    role: msg.role === 'assistant' ? 'model' : 'user'
                })),
                generationConfig: {
                    temperature: this.temperature,
                    maxOutputTokens: requestOpts.max_tokens,
                    topP: requestOpts.top_p,
                }
            };
        }
        else {
            // OpenAI and OpenRouter compatible
            return {
                model: requestModel,
                messages: messages.map((m) => ({ role: m.role, content: m.content })),
                temperature: this.temperature,
                ...requestOpts
            };
        }
    }
    buildUrl(endpoint) {
        if (this.provider === 'gemini') {
            return `${this.baseUrl}/models/${this.model}:${endpoint}?key=${this.apiKey}`;
        }
        else {
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
                const body = await res.text().catch(() => '');
                if (retriesLeft > 0 && (res.status === 429 || res.status >= 500)) {
                    await delay(1000);
                    return this.fetchWithRetry(url, opts, retriesLeft - 1);
                }
                throw new Error(`${this.provider} request failed ${res.status}: ${body}`);
            }
            return res.json();
        }
        catch (err) {
            if (retriesLeft > 0) {
                await delay(1000);
                return this.fetchWithRetry(url, opts, retriesLeft - 1);
            }
            throw err;
        }
    }
    async createChatCompletion(messages, model, opts = {}) {
        const endpoint = this.provider === 'gemini' ? 'generateContent' : 'chat/completions';
        const url = this.buildUrl(endpoint);
        const body = this.buildRequestBody(messages, model, opts);
        return this.fetchWithRetry(url, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    }
    async parseText(text, customPrompt) {
        const prompt = customPrompt || this.parsingPrompt;
        const messages = [
            { role: 'system', content: prompt },
            { role: 'user', content: text }
        ];
        try {
            const response = await this.createChatCompletion(messages);
            if (this.provider === 'gemini') {
                return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }
            else {
                return response.choices?.[0]?.message?.content || '';
            }
        }
        catch (error) {
            console.error(`Error parsing text with ${this.provider}:`, error);
            throw error;
        }
    }
}
// Backward compatibility
export class OpenAIConsumer extends AIConsumer {
    constructor() {
        super('openai-gpt-3.5-turbo'); // Use a valid provider key from config
    }
}
export const openaiConsumer = new OpenAIConsumer();
// New provider instances - use valid provider keys from config
export const openrouterConsumer = new AIConsumer('openrouter-gpt-4');
export const geminiConsumer = new AIConsumer('gemini-pro');
//# sourceMappingURL=openai-consumer.js.map